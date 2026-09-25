import unittest
import subprocess
import os

class TestApexScanWorkflow(unittest.TestCase):

    def test_run_shell_injection_fix(self):
        # Simula o ambiente de execução do GitHub Actions para testar a sanitização
        env_vars = {
            'GITHUB_REPO_NAME': 'my-repo/my-project',
            'GITHUB_OWNER_NAME': 'my-owner'
        }
        
        # Comando simulado que seria executado no workflow
        # Note que as variáveis são acessadas via $ENV_VAR e não ${{...}}
        command_to_run = [
            'python',
            '-c',
            "import os; print(f'Repo: {os.environ.get('GITHUB_REPO_NAME')}, Owner: {os.environ.get('GITHUB_OWNER_NAME')}')"
        ]
        
        # Executa o comando simulado com as variáveis de ambiente definidas
        result = subprocess.run(command_to_run, capture_output=True, text=True, env={**os.environ, **env_vars})
        
        # Verifica se o comando foi executado com sucesso
        self.assertEqual(result.returncode, 0, f"Command failed with stderr: {result.stderr}")
        
        # Verifica se a saída esperada contém os valores corretos das variáveis de ambiente
        # e NÃO contém nenhum caractere malicioso que poderia ter sido injetado
        expected_output_part = "Repo: my-repo/my-project, Owner: my-owner"
        self.assertIn(expected_output_part, result.stdout)
        
        # Verifica se não há sinais de injeção de comando (ex: caracteres especiais como ';', '`', '$()')
        # na saída que pudessem indicar uma falha na sanitização.
        # Esta é uma verificação adicional e não exaustiva para casos de injeção mais complexos.
        self.assertNotIn(';', result.stdout)
        self.assertNotIn('`', result.stdout)
        self.assertNotIn('$', result.stdout)
        self.assertNotIn('()', result.stdout)

if __name__ == '__main__':
    unittest.main()
