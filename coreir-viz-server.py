import coreir
import json
import os
import subprocess

from flask import Flask, request, send_from_directory, request, flash, redirect, url_for

app = Flask("coreir-viz-server", static_url_path='')


def get_referenced_modules(definition, suffix, coreir_json, context):
    referenced_modules = {}
    for instance in definition.instances:
        if '-combview' in suffix:
            added = False
            for _, namespace in coreir_json['namespaces'].items():
                if 'modules' in namespace:
                    for module_name, module in namespace['modules'].items():
                        if module_name == instance.module.name:
                            orig_namespace, orig_module_name = module['metadata']['original'].split('.')
                            namespace = context.get_namespace(orig_namespace)
                            if orig_module_name in namespace.generators:
                                added = True
                                break
                            orig_module = namespace.modules[orig_module_name]
                            referenced_modules[instance.module.name] = orig_module
                            added = True
                            if orig_module.definition is not None:
                                referenced_modules.update(
                                    get_referenced_modules(orig_module.definition, suffix, coreir_json, context))
                if added == True:
                    break
            if not added:
                print(coreir_json)
                raise Exception(f"module not found: {instance.module.name}")
        else:
            if instance.module.name not in referenced_modules:
                referenced_modules[instance.module.name] = instance.module
                if instance.module.definition is not None:
                    referenced_modules.update(
                        get_referenced_modules(instance.module.definition, suffix, coreir_json, context))
    return referenced_modules

def gen_dot(basename):

    for with_ports in [False, True]:
        for suffix in ['', '-combview', '-undirected']:
            context = coreir.Context()
            if suffix == '-combview':
                coreir_file = f'uploads/{basename}-combview.json'
            else:
                coreir_file = f'uploads/{basename}.json'
            module = context.load_from_file(coreir_file)
            with open(coreir_file, "r") as f:
                coreir_json = json.load(f)
            top_name = module.name
            directed = suffix != "-undirected"
            if with_ports is False:
                suffix += "-noports"
            referenced_modules = get_referenced_modules(module.definition, suffix, coreir_json, context)
            referenced_modules[module.name] = module
            module_instance_map = {}
            for module in referenced_modules.values():
                module_instance_map[module.name] = {}
                if module.definition is None:
                    continue
                dot = []
                if directed:
                    dot.append("digraph {")
                else:
                    dot.append("graph {")

                module_type = module.definition.interface.type
                module_type = coreir.type.Record(module_type.ptr, module_type.context)
                # label = f"self | "
                # ports = []
                # for key, value in module_type.items():
                #     ports.append(f"<{key}> {key}")
                # label += " | ".join(ports)
                # dot.append(f"self [shape=\"record\" label=\"{label}\"];")
                for key, value in module_type.items():
                    dot.append(f"self{key} [label=\"self.{key}\"];")
                for instance in module.definition.instances:
                    module_instance_map[module.name][instance.name] = instance.module.name
                    input_ports = []
                    output_ports = []
                    module_type = instance.module.type
                    module_type = coreir.type.Record(module_type.ptr, module_type.context)
                    for key, value in module_type.items():
                        if value.is_input():
                            input_ports.append(f"<{key}> {key}")
                        else:
                            output_ports.append(f"<{key}> {key}")
                    inst_name = instance.name
                    module_str = f"[{instance.module.name}]"
                    if "bit_const" in inst_name:
                        if "VCC" in inst_name:
                            inst_name = "1"
                        else:
                            assert "GND" in inst_name
                            inst_name = "0"
                        module_str = ""
                    input_ports_str = "{" + " | ".join(input_ports) + "} |" if input_ports else ""
                    if with_ports:
                        label = "{" + input_ports_str + " {" + f"{inst_name} {module_str} }} | {{" + " | ".join(output_ports) + "}}"
                        dot.append(f"{instance.name} [shape=\"record\" label=\"{label}\"];")
                    else:
                        label = f"{inst_name} {module_str}"
                        dot.append(f"{instance.name} [shape=\"rect\" label=\"{label}\"];")
                    # label += "}}"

                connections = set()
                if directed:
                    for connection in module.directed_module.connections:
                        first_inst = ":".join(connection.source[:2]).replace("self:", "self")
                        second_inst = ":".join(connection.sink[:2]).replace("self:", "self")
                        if with_ports is False:
                            first_inst = first_inst.split(":")[0]
                            second_inst = second_inst.split(":")[0]
                        # dot.append(f"{first_inst} -> {second_inst}")
                        connections.add(f"{first_inst} -> {second_inst}")
                else:
                    for connection in module.definition.connections:
                        first_inst = ":".join(connection.first.selectpath[:2]).replace("self:", "self")
                        second_inst = ":".join(connection.second.selectpath[:2]).replace("self:", "self")
                        if with_ports is False:
                            first_inst = first_inst.split(":")[0]
                            second_inst = second_inst.split(":")[0]
                        # dot.append(f"{first_inst} -- {second_inst}")
                        connections.add(f"{first_inst} -- {second_inst}")
                dot.extend(connections)
                dot.append("}")
                # print("\n".join(dot))
                # print(f"static/build/{module.name}{suffix}.dot")
                # print(f"static/build/{module.name}{suffix}.dot")
                with open(f"static/build/{module.name}{suffix}.dot", "w") as dot_file:
                    dot_file.write("\n".join(dot))
            app.config[f'module_instance_map{suffix}'] = json.dumps(module_instance_map)
    return top_name

def build_dot(coreir_json_file):
    # basename = "silica_detect111"
    # module = context.load_from_file(f"{basename}.json")
    basename = coreir_json_file.split('.')[0]
    subprocess.run(f"coreir -i uploads/{coreir_json_file} -p rungenerators,cullgraph,transform2combview -o uploads/{basename}-combview.json -n global,coreir,mantle,corebit --load_libs /usr/local/lib/libcoreir-commonlib.dylib".split(' '))


    top_name = gen_dot(basename)
    app.config['TOP_MODULE'] = top_name

@app.route('/load_coreir_file', methods=['POST'])
def load_coreir_file():
    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    filename = file.filename
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    build_dot(filename)
    return redirect(url_for('root'))

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('static/js', path)

@app.route('/build/<path:path>')
def send_build(path):
    return send_from_directory('static/build', path)

@app.route('/top_module')
def get_top_module():
    top_module = app.config['TOP_MODULE']
    if top_module is None:
        return ''
    return top_module

@app.route('/module_instance_map')
def module_instance_map():
    retval = app.config['module_instance_map']
    return retval if retval else ""

@app.route('/module_instance_map-combview')
def module_instance_map_combview():
    retval = app.config['module_instance_map-combview']
    return retval if retval else ""

@app.route('/')
def root():
    return app.send_static_file('index.html')

UPLOAD_FOLDER = "uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TOP_MODULE'] = None
app.config['module_instance_map'] = None
app.config['module_instance_map-combview'] = None
if __name__ == "__main__":
    app.run()
