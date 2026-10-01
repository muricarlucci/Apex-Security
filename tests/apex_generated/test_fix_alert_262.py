import yaml
import os

def test_github_actions_pinned_shas():
    workflow_path = ".github/workflows/apex-scan.yml"
    if os.path.exists(workflow_path):
        with open(workflow_path, "r") as f:
            data = yaml.safe_load(f)
        
        steps = data.get("jobs", {}).get("scan", {}).get("steps", [])
        for step in steps:
            uses = step.get("uses", "")
            if "@" in uses:
                action, ref = uses.split("@")
                # Verifica se o ref tem exatamente 40 caracteres (SHA completo)
                assert len(ref) == 40, f"A action {action} esta usando uma tag mutavel ({ref}). Utilize um SHA de 40 caracteres."
