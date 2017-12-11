Install coreir: https://github.com/rdaly525/coreir
```
git clone https://github.com/rdaly525/coreir.git
cd coreir
sudo make install  # -j 8 for parallel build with 8 threads
```

Get the Python dependencies
```
pip install -r requirements.txt
```

Run the server
```
FLASK_APP=coreir-viz-server.py flask run
```

Open the web endpoint logged by Flask (for me it is localhost:5000).

Select a file using the "Choose file" menu on the bottom right, this repository
contains a set of examples in the `examples/` directory.
