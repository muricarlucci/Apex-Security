import pytest
import os
from app import app  # Assumindo que seu código Flask está em app.py

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_upload_file(client):
    # Cria um arquivo de teste simulado
    test_file_content = b'This is a test file.'
    with open('test_upload.txt', 'wb') as f:
        f.write(test_file_content)

    with open('test_upload.txt', 'rb') as f:
        response = client.post('/', data={'file': (f, 'test_upload.txt')})

    # Verifica se o upload foi bem-sucedido
    assert response.status_code == 200
    assert b'File uploaded successfully: test_upload.txt' in response.data

    # Verifica se o arquivo foi salvo no bucket S3 simulado
    assert os.path.exists('./s3_bucket_mock/test_upload.txt')

    # Limpa o arquivo de teste e o arquivo carregado
    os.remove('test_upload.txt')
    os.remove('./s3_bucket_mock/test_upload.txt')

def test_upload_invalid_file(client):
    # Tenta fazer upload de um arquivo com extensão não permitida
    test_file_content = b'This is a test file.'
    with open('test_upload.exe', 'wb') as f:
        f.write(test_file_content)

    with open('test_upload.exe', 'rb') as f:
        response = client.post('/', data={'file': (f, 'test_upload.exe')})

    # Verifica se o upload foi rejeitado
    assert response.status_code == 200
    # A mensagem de erro exata pode variar dependendo da implementação, mas esperamos uma falha
    assert b'File uploaded successfully:' not in response.data
    # Se você tiver uma mensagem de erro específica para extensões inválidas, pode adicioná-la aqui

    # Limpa o arquivo de teste
    os.remove('test_upload.exe')
