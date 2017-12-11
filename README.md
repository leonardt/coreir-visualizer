Install coreir's dev branch: https://github.com/rdaly525/coreir
```
git clone -b 448b-freeze https://github.com/rdaly525/coreir.git
cd coreir
sudo make install  # -j 8 for parallel build with 8 threads
```

Get the Python dependencies
```
pip install -r requirements.txt
# Need the dev branch of pycoreir
pip install git+git://github.com/leonardt/pycoreir.git@448b-freeze
```

Run the server
```
FLASK_APP=coreir-viz-server.py flask run
```

Open the web endpoint logged by Flask (for me it is localhost:5000).

Select a file using the "Choose file" menu on the bottom right, this repository
contains a set of examples in the `examples/` directory.

Top left menu shows level in the module hierarchy. Top right menu allows you to
highlight instances of a specific module type. Bottom left menu lets you select
different views and layout engines.
