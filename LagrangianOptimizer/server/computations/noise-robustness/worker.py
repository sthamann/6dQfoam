import json
import sys

def main():
    data = json.loads(sys.argv[1])
    result = {
        "success": True,
        "signal_noise_ratio": 15000,
        "runtime": 500
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main() 