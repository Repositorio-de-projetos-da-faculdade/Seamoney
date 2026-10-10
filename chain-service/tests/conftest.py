import sys
from pathlib import Path

# make `import app` work when pytest is started from the chain-service folder
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
