/* 浏览器内 Python（Pyodide）。第一次点「运行」时才从 CDN 加载，所以需要联网；加载完成后同一页面里不再重复下载。 */
(function (global) {
  "use strict";
  const VERSION = "v0.26.4";
  const BASE = `https://cdn.jsdelivr.net/pyodide/${VERSION}/full/`;

  let pyodidePromise = null;
  const loadedPackages = new Set();
  const installedPip = new Set();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("加载 Python 运行环境失败：请检查网络（需要访问 cdn.jsdelivr.net）"));
      document.head.append(s);
    });
  }

  // 在 Pyodide 里定义的辅助函数：执行一个单元格，返回 JSON（标准输出、最后一个表达式的值、图片、错误）。
  const HELPER = `
import ast, base64, contextlib, io, json, os, sys, traceback, warnings

_NS = {"__name__": "__main__"}

def reset_namespace():
    _NS.clear()
    _NS["__name__"] = "__main__"

def _fmt(value):
    if hasattr(value, "to_string"):
        return value.to_string(max_rows=30)
    return repr(value)

def _figures():
    if "matplotlib.pyplot" not in sys.modules:
        return []
    plt = sys.modules["matplotlib.pyplot"]
    images = []
    for number in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(number).savefig(buf, format="png", dpi=80, bbox_inches="tight")
        images.append(base64.b64encode(buf.getvalue()).decode())
    plt.close("all")
    return images

def run_cell(source):
    out = io.StringIO()
    result = None
    error = None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            try:
                tree = ast.parse(source)
                last = None
                if tree.body and isinstance(tree.body[-1], ast.Expr):
                    last = ast.Expression(tree.body.pop().value)
                exec(compile(tree, "<cell>", "exec"), _NS)
                if last is not None:
                    value = eval(compile(last, "<cell>", "eval"), _NS)
                    if value is not None:
                        result = _fmt(value)
            except BaseException:
                error = "".join(traceback.format_exc().splitlines(True)[-6:])
    return json.dumps({"stdout": out.getvalue(), "result": result, "error": error, "images": _figures()})
`;

  async function getPyodide(onStatus) {
    if (!pyodidePromise) {
      pyodidePromise = (async () => {
        onStatus("正在下载 Python 运行环境（首次约几十秒）…");
        await loadScript(`${BASE}pyodide.js`);
        const py = await global.loadPyodide({ indexURL: BASE });
        py.runPython(HELPER);
        return py;
      })().catch((err) => { pyodidePromise = null; throw err; });
    }
    return pyodidePromise;
  }

  async function ensurePackages(py, question, onStatus) {
    const need = question.py.pkgs.filter((p) => !loadedPackages.has(p));
    if (need.length) {
      onStatus(`正在加载 ${need.join("、")}…`);
      await py.loadPackage(need);
      need.forEach((p) => loadedPackages.add(p));
    }
    const pip = question.py.pip.filter((p) => !installedPip.has(p));
    if (pip.length) {
      onStatus(`正在从 PyPI 安装 ${pip.join("、")}…`);
      await py.loadPackage("micropip");
      const micropip = py.pyimport("micropip");
      for (const name of pip) {
        await micropip.install(name);
        installedPip.add(name);
      }
    }
    if (loadedPackages.has("matplotlib") || pip.includes("seaborn")) py.runPython("import matplotlib; matplotlib.use('AGG')");
  }

  /** 把素材写进 Pyodide 的虚拟文件系统，并切到该题专属目录。 */
  function prepareFiles(py, qid, files) {
    const dir = `/work/${qid}`;
    py.FS.mkdirTree(dir);
    for (const [name, text] of Object.entries(files)) {
      const full = `${dir}/${name}`;
      py.FS.mkdirTree(full.slice(0, full.lastIndexOf("/")));
      py.FS.writeFile(full, text);
    }
    py.runPython(`import os; os.chdir(${JSON.stringify(dir)}); reset_namespace()`);
  }

  /**
   * 依次运行 sources（每个单元格一段源码）。onCell(index, result) 在每个单元格结束后回调；
   * 遇到错误就停止后面的单元格，和 Jupyter 里「运行全部」遇错中断一致。
   */
  async function runAll(question, files, sources, { onStatus, onCell }) {
    const py = await getPyodide(onStatus);
    await ensurePackages(py, question, onStatus);
    prepareFiles(py, question.id, files);
    const runCell = py.globals.get("run_cell");
    try {
      for (let i = 0; i < sources.length; i++) {
        onStatus(`正在运行第 ${i + 1} / ${sources.length} 个代码块…`);
        await new Promise((r) => setTimeout(r, 0)); // 让界面先刷新
        const result = JSON.parse(runCell(sources[i]));
        onCell(i, result);
        if (result.error) return false;
      }
      return true;
    } finally {
      runCell.destroy();
    }
  }

  global.CQ = Object.assign(global.CQ || {}, { runner: { runAll } });
})(window);
