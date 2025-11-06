import socket, base64
from Crypto.Cipher import AES

SECRET_KEY = b"SentinelVPNKey32BytesSecure!!!!!"  # 32 bytes
BLOCK_SIZE = 16

def pad(data: bytes) -> bytes:
    pad_len = BLOCK_SIZE - len(data) % BLOCK_SIZE
    return data + bytes([pad_len]) * pad_len

def unpad(data: bytes) -> bytes:
    pad_len = data[-1]
    return data[:-pad_len]

def encrypt_message(msg: str) -> bytes:
    cipher = AES.new(SECRET_KEY, AES.MODE_ECB)
    raw = msg.encode("utf-8")
    encrypted = cipher.encrypt(pad(raw))
    b64 = base64.b64encode(encrypted)
    print(f"🔒 Encrypted {len(raw)} bytes → {len(b64)} bytes Base64")
    return b64

def decrypt_message(enc: str) -> str:
    cipher = AES.new(SECRET_KEY, AES.MODE_ECB)
    decoded = base64.b64decode(enc)
    decrypted = cipher.decrypt(decoded)
    result = unpad(decrypted).decode("utf-8", errors="ignore")
    return result

def start_client():
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect(("127.0.0.1", 9090))
    print("🔌 Connected to SentinelVPN server")

    while True:
        url = input("🌐 Enter a URL (or 'exit'): ").strip()
        if url.lower() == "exit":
            break

        enc = encrypt_message(url)
        client.sendall(enc + b"\n")

        data = client.recv(65536)
        decrypted = decrypt_message(data.decode())

        print("✅ Response received (first 300 chars):\n")
        print(decrypted[:300])
        print("—" * 50)

    client.close()
    print("🔒 VPN tunnel closed.")

if __name__ == "__main__":
    start_client()
