"""Run every browser test:  python3 source/tests/run.py [name-filter ...]  (a test runs when its name contains any filter)"""
import importlib, pathlib, sys, time, traceback

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from harness import browser, server  # noqa: E402

flt = sys.argv[1:]
mods = [importlib.import_module(p.stem) for p in sorted(pathlib.Path(__file__).parent.glob("test_*.py"))]
failed = 0
with server() as base, browser() as b:
    for m in mods:
        for name in [n for n in dir(m) if n.startswith("test_")]:
            full = f"{m.__name__}.{name}"
            if flt and not any(f in full for f in flt):
                continue
            t0 = time.time()
            try:
                getattr(m, name)(b, base)
                print(f"  ok    {full}  ({time.time() - t0:.1f}s)")
            except Exception as e:
                failed += 1
                print(f"  FAIL  {full}\n" + "".join(traceback.format_exception_only(type(e), e)).strip()[:1500])
print("all passed" if not failed else f"{failed} failed")
sys.exit(1 if failed else 0)
