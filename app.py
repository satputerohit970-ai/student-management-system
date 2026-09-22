"""
Root launcher for Student Management System.
Allows running `python app.py` directly from the project root directory.
"""
import sys
import os
import runpy

if __name__ == '__main__':
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)
    backend_app = os.path.join(backend_dir, 'app.py')
    runpy.run_path(backend_app, run_name='__main__')
