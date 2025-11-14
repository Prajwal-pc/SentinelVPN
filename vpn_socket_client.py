# vpn_socket_client.py
import socket, base64, hashlib, json, time
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

HOST = '127.0.0.1'
PORT = 9000

SECRET_KEY = 'sentinelvpn-dev-key'   # must match server
SECRET_IV  = 'sentinelvpn-dev-iv'    # must match server

KEY = hashlib.sha256(SECRET_KEY.encode()).digest()  # 32 bytes
IV  = hashlib.md5(SECRET_IV.encode()).digest()      # 16 bytes

def encrypt_to_b64(plaintext: str) -> str:
    cipher = AES.new(KEY, AES.MODE_CBC, IV)
    ct = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
    return base64.b64encode(ct).decode('utf-8')

def decrypt_from_b64(b64text: str) -> str:
    ct = base64.b64decode(b64text.encode('utf-8'))
    cipher = AES.new(KEY, AES.MODE_CBC, IV)
    pt = unpad(cipher.decrypt(ct), AES.block_size)
    return pt.decode('utf-8')

def main():
    print("🔌 Connecting to SentinelVPN server ...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((HOST, PORT))
    print("✅ Connected.\nType a message (or 'exit'): ")
    try:
        while True:
            msg = input('> ')
            if msg.strip().lower() == 'exit':
                break
            b64 = encrypt_to_b64(msg)
            s.sendall((b64 + '\n').encode('utf-8'))
            print(f"🔒 Encrypted {len(msg)} bytes → {len(b64)} bytes Base64")
            # ACK
            ack = s.recv(4096).decode('utf-8').strip()
            try:
                ack_json = json.loads(decrypt_from_b64(ack))
            except Exception:
                ack_json = {"raw": ack}
            print("🧾 Server ACK:", ack_json)
    finally:
        s.close()
        print("🔚 Closed.")
if __name__ == '__main__':
    main()
