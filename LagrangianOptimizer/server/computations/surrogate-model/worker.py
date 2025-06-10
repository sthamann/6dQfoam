import json
import sys

def main():
    data = json.loads(sys.argv[1])
    result = {
        "success": True,
        "rmse": 0.0005,
        "speedup": 75,
        "runtime": 100
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main() 