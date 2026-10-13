from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import AllChem
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Phase-Conform-AI Backend", "engine": "RDKit & MMFF94"}


class MoleculeRequest(BaseModel):
    smiles: str
    active_bond: list = None

class InvertRequest(BaseModel):
    smiles: str
    atom_index: int

@app.post("/api/invert_stereo")
def invert_stereo(req: InvertRequest):
    mol = Chem.MolFromSmiles(req.smiles)
    if not mol:
        raise HTTPException(status_code=400, detail="Invalid SMILES")
    
    mol = Chem.AddHs(mol)
    try:
        atom = mol.GetAtomWithIdx(req.atom_index)
        tag = atom.GetChiralTag()
        if tag == Chem.rdchem.ChiralType.CHI_TETRAHEDRAL_CW:
            atom.SetChiralTag(Chem.rdchem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif tag == Chem.rdchem.ChiralType.CHI_TETRAHEDRAL_CCW:
            atom.SetChiralTag(Chem.rdchem.ChiralType.CHI_TETRAHEDRAL_CW)
        else:
            atom.SetChiralTag(Chem.rdchem.ChiralType.CHI_TETRAHEDRAL_CW)
            
        mol = Chem.RemoveHs(mol)
        Chem.AssignStereochemistry(mol, force=True, cleanIt=True)
        new_smiles = Chem.MolToSmiles(mol, isomericSmiles=True)
        return {"smiles": new_smiles}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

import re
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem import rdMolDescriptors

class Structure2DRequest(BaseModel):
    smiles: str
    width: int = 380
    height: int = 280

def render_2d_skeletal_svg(mol, width=380, height=280):
    try:
        mol_2d = Chem.Mol(mol)
        mol_2d = Chem.RemoveHs(mol_2d)
        AllChem.Compute2DCoords(mol_2d)
        drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
        opts = drawer.drawOptions()
        opts.clearBackground = False
        opts.bondLineWidth = 2.4
        opts.addStereoAnnotation = True
        opts.padding = 0.12
        drawer.DrawMolecule(mol_2d)
        drawer.FinishDrawing()
        svg_text = drawer.GetDrawingText()
        svg_text = re.sub(r'<\?xml.*?\?>', '', svg_text).strip()
        return svg_text
    except Exception as e:
        print("Error generating 2D SVG:", e)
        return ""

def find_all_rotatable_bonds(mol):
    from rdkit.Chem import Lipinski
    matches = mol.GetSubstructMatches(Lipinski.RotatableBondSmarts)
    if matches:
        return matches
    pattern = Chem.MolFromSmarts('[!#1;!$(*#*)]-&!@[!#1;!$(*#*)]')
    if pattern:
        fallback = mol.GetSubstructMatches(pattern)
        if fallback:
            return fallback
    return ()

@app.post("/api/analyze")
def analyze_molecule(req: MoleculeRequest):
    mol_no_h = Chem.MolFromSmiles(req.smiles)
    if not mol_no_h:
        raise HTTPException(status_code=400, detail="Invalid SMILES string")
    
    # Find conformational rotatable bonds on heavy atoms (excluding terminal methyl spins)
    rot_bonds = find_all_rotatable_bonds(mol_no_h)
    
    # Add Hydrogens and generate 3D coordinates
    mol = Chem.AddHs(mol_no_h)
    
    # Fallback for small molecules (e.g., ethane) with only 1 single bond between heavy atoms
    if not rot_bonds:
        single_bonds = [(b.GetBeginAtomIdx(), b.GetEndAtomIdx()) for b in mol.GetBonds() 
                        if b.GetBondTypeAsDouble() == 1.0 and not b.IsInRing() 
                        and mol.GetAtomWithIdx(b.GetBeginAtomIdx()).GetAtomicNum() > 1 
                        and mol.GetAtomWithIdx(b.GetEndAtomIdx()).GetAtomicNum() > 1]
        if single_bonds:
            rot_bonds = tuple(single_bonds)
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    res = AllChem.EmbedMolecule(mol, params)
    if res != 0:
        res = AllChem.EmbedMolecule(mol, useRandomCoords=True, randomSeed=42)
    if res != 0:
        raise HTTPException(status_code=400, detail="Failed to generate 3D coordinates")
    
    # Initial quick geometry optimization
    try:
        AllChem.MMFFOptimizeMolecule(mol)
    except Exception:
        pass
    
    # Compute Stereocenters (R/S) for Advanced Isomer Visualization
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True, flagPossibleStereoCenters=True)

    # Compute Gasteiger partial charges for rich atomic descriptors
    try:
        AllChem.ComputeGasteigerCharges(mol)
    except Exception:
        pass

    conf = mol.GetConformer()
    
    # Choose active bond and dihedral atoms
    active_bond = None
    a1_idx, a2_idx, a3_idx, a4_idx = None, None, None, None
    if rot_bonds:
        if req.active_bond and tuple(req.active_bond) in rot_bonds:
            active_bond = tuple(req.active_bond)
        else:
            active_bond = rot_bonds[0]

        a2_idx, a3_idx = active_bond
        a2_atom = mol.GetAtomWithIdx(a2_idx)
        a3_atom = mol.GetAtomWithIdx(a3_idx)

        # Prioritize heavy atoms (atomic number > 1) for a1 and a4 to trace main-chain dihedral
        a1_nbrs = [nbr.GetIdx() for nbr in a2_atom.GetNeighbors() if nbr.GetIdx() != a3_idx]
        a4_nbrs = [nbr.GetIdx() for nbr in a3_atom.GetNeighbors() if nbr.GetIdx() != a2_idx]
        if a1_nbrs:
            a1_nbrs.sort(key=lambda idx: (mol.GetAtomWithIdx(idx).GetAtomicNum() > 1, idx), reverse=True)
        if a4_nbrs:
            a4_nbrs.sort(key=lambda idx: (mol.GetAtomWithIdx(idx).GetAtomicNum() > 1, idx), reverse=True)

        if a1_nbrs and a4_nbrs:
            a1_idx = a1_nbrs[0]
            a4_idx = a4_nbrs[0]
            # Zero-Phase Calibration: set baseline dihedral to 0.0° so 3D coordinates match 0° on PES
            try:
                Chem.rdMolTransforms.SetDihedralDeg(conf, a1_idx, a2_idx, a3_idx, a4_idx, 0.0)
            except Exception:
                pass

    # Extract Coordinates & Rich Atomic Descriptors for the frontend and GNN
    atoms = []
    for i, atom in enumerate(mol.GetAtoms()):
        pos = conf.GetAtomPosition(i)
        stereo = ""
        if atom.HasProp('_CIPCode'):
            stereo = atom.GetProp('_CIPCode')
            
        hyb_enum = str(atom.GetHybridization())
        hyb_val = 0.75 if "SP3" in hyb_enum else (0.5 if "SP2" in hyb_enum else (0.25 if "SP" in hyb_enum else 0.5))
        val_val = min(1.0, atom.GetTotalValence() / 6.0)

        charge_val = 0.0
        if atom.HasProp('_GasteigerCharge'):
            try:
                c = float(atom.GetProp('_GasteigerCharge'))
                if not math.isnan(c) and not math.isinf(c):
                    charge_val = c
            except Exception:
                pass

        atoms.append({
            "index": i,
            "element": atom.GetSymbol(),
            "x": pos.x,
            "y": pos.y,
            "z": pos.z,
            "stereo": stereo,
            "hybridization": hyb_val,
            "valence": val_val,
            "charge": round(charge_val, 4)
        })

    # Bonds
    bonds = []
    for bond in mol.GetBonds():
        bonds.append({
            "start": bond.GetBeginAtomIdx(),
            "end": bond.GetEndAtomIdx(),
            "type": bond.GetBondTypeAsDouble()
        })

    svg_2d = render_2d_skeletal_svg(mol_no_h)

    # If there's no rotatable bond, return static optimized geometry
    if not rot_bonds or a1_idx is None or a4_idx is None:
        return {
            "atoms": atoms,
            "bonds": bonds,
            "energies": [],
            "rotatable_bonds": [{"a2": b[0], "a3": b[1]} for b in rot_bonds],
            "active_bond": {"a2": active_bond[0], "a3": active_bond[1]} if active_bond else None,
            "rotatable_bond": {"a2": active_bond[0], "a3": active_bond[1]} if active_bond else None,
            "svg_2d": svg_2d,
            "message": "No rotatable dihedral bond found. Showing static optimized geometry."
        }

    # Relaxed Dihedral Potential Energy Surface Scan (Constrained Optimization)
    energies = []
    mmff_props = AllChem.MMFFGetMoleculeProperties(mol)

    for angle in range(0, 361, 5):
        Chem.rdMolTransforms.SetDihedralDeg(conf, a1_idx, a2_idx, a3_idx, a4_idx, float(angle))
        
        ff = None
        if mmff_props:
            ff = AllChem.MMFFGetMoleculeForceField(mol, mmff_props)
            if ff:
                ff.MMFFAddTorsionConstraint(a1_idx, a2_idx, a3_idx, a4_idx, False, float(angle), float(angle), 1000.0)
        
        if not ff:
            ff = AllChem.UFFGetMoleculeForceField(mol)
            if ff:
                ff.UFFAddTorsionConstraint(a1_idx, a2_idx, a3_idx, a4_idx, False, float(angle), float(angle), 1000.0)

        raw_kcal = 0.0
        if ff:
            ff.Initialize()
            ff.Minimize(maxIts=50) # Fast constrained relaxation
            raw_kcal = ff.CalcEnergy()

        energies.append({"angle": angle, "raw_kcal": raw_kcal})

    # Reset conformer back to 0.0° baseline
    Chem.rdMolTransforms.SetDihedralDeg(conf, a1_idx, a2_idx, a3_idx, a4_idx, 0.0)

    # Normalize energies relative to minimum & convert to both kJ/mol and kcal/mol
    if energies:
        min_kcal = min(e["raw_kcal"] for e in energies)
        for e in energies:
            delta_kcal = e["raw_kcal"] - min_kcal
            delta_kj = delta_kcal * 4.184
            e["energy"] = round(delta_kj, 3) # Primary energy in kJ/mol
            e["energy_kcal"] = round(delta_kcal, 3)
            e["energy_kj"] = round(delta_kj, 3)
            del e["raw_kcal"]

    return {
        "atoms": atoms,
        "bonds": bonds,
        "energies": energies,
        "rotatable_bonds": [{"a2": b[0], "a3": b[1]} for b in rot_bonds],
        "active_bond": {"a2": a2_idx, "a3": a3_idx},
        "rotatable_bond": {"a2": a2_idx, "a3": a3_idx},
        "dihedral_indices": [a1_idx, a2_idx, a3_idx, a4_idx],
        "scan_mode": "relaxed_adiabatic",
        "svg_2d": svg_2d,
        "message": "Success"
    }

@app.post("/api/2d_structure")
def get_2d_structure(req: Structure2DRequest):
    mol = Chem.MolFromSmiles(req.smiles)
    if not mol:
        raise HTTPException(status_code=400, detail="Invalid SMILES string")
    svg = render_2d_skeletal_svg(mol, width=req.width, height=req.height)
    return {"smiles": req.smiles, "svg": svg}

