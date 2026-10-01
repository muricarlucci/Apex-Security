import unittest
import os
from your_module import Configuration

class TestConfiguration(unittest.TestCase):

    def setUp(self):
        # Cria um arquivo dummy para a chave privada
        with open('private_key.pem', 'w') as f:
            f.write('-----BEGIN PRIVATE KEY-----\nfake_private_key\n-----END PRIVATE KEY-----')
        
        # Define uma variável de ambiente para a API Key
        os.environ['API_KEY'] = 'fake_api_key'

    def tearDown(self):
        # Remove o arquivo dummy e a variável de ambiente
        if os.path.exists('private_key.pem'):
            os.remove('private_key.pem')
        if 'API_KEY' in os.environ:
            del os.environ['API_KEY']

    def test_loads_api_key_from_env(self):
        config = Configuration()
        self.assertEqual(config.get_api_key(), 'fake_api_key')

    def test_loads_private_key_from_file(self):
        config = Configuration()
        self.assertIsNotNone(config.get_private_key())
        self.assertIn('fake_private_key', config.get_private_key())

    def test_handles_missing_private_key_file(self):
        # Remove o arquivo para simular a ausência
        if os.path.exists('private_key.pem'):
            os.remove('private_key.pem')
        
        config = Configuration()
        self.assertIsNone(config.get_private_key())

if __name__ == '__main__':
    unittest.main()
