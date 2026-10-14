#!/usr/bin/env python3
"""Turn a Nuke script (.nk) into the node-tree data the website draws (assets/nodetrees/<slug>.json).

    python tools/nk2tree.py path/to/script.nk assets/nodetrees/<slug>.json

Only the layout is kept: node class, name, position, colour, backdrop labels and which node feeds which.
File paths, render settings, expressions and every other knob are left out, so nothing private ends up on the site.
Nodes inside Groups are not drawn (the Group shows as one node, as it does in Nuke's main node graph).
"""
import json, re, sys

def blocks(text):
    """Yield top-level statements: ('node', cls, body) for `Class { ... }` and ('cmd', line) for push/set/end_group."""
    i, n = 0, len(text)
    while i < n:
        j = text.find("\n", i)
        if j < 0: j = n
        line = text[i:j].strip()
        m = re.match(r"^(clone \$\w+|[A-Za-z_][\w.]*) \{$", line)
        if m:
            # read to the matching close brace (quotes and backslash escapes respected)
            k, depth, q = j + 1, 1, False
            while k < n and depth:
                c = text[k]
                if c == "\\": k += 2; continue
                if c == '"': q = not q
                elif not q and c == "{": depth += 1
                elif not q and c == "}": depth -= 1
                k += 1
            yield ("node", m.group(1), text[j + 1:k - 1])
            nl = text.find("\n", k)
            i = n if nl < 0 else nl + 1
            continue
        if line:
            yield ("cmd", line)
        i = j + 1

def knobs(body):
    """Simple single-line knobs at the top level of a node body."""
    out, depth = {}, 0
    for raw in body.split("\n"):
        line = raw.strip()
        if depth == 0:
            m = re.match(r"^(\w+) (.*)$", line)
            if m and m.group(1) not in out: out[m.group(1)] = m.group(2)
        depth += line.count("{") - line.count("\\{") - (line.count("}") - line.count("\\}"))
        depth = max(depth, 0)
    return out

def unq(v):
    v = v.strip()
    if len(v) >= 2 and v[0] == '"' and v[-1] == '"': v = v[1:-1]
    return v.replace('\\"', '"').replace("\\n", "\n")

def num(v, d=0):
    try: return float(unq(v))
    except Exception: return d

def convert(path):
    text = open(path, encoding="utf-8", errors="replace").read()
    nodes, edges, backdrops, notes = [], [], [], []
    stacks = [[]]           # one stack per group level
    saved = [{}]            # `set` variables per level
    depth = 0               # 0 = main node graph
    for kind, *rest in blocks(text):
        st, sv = stacks[-1], saved[-1]
        if kind == "cmd":
            line = rest[0]
            if line.startswith("push "):
                arg = line[5:].strip()
                st.append(None if arg == "0" else sv.get(arg.lstrip("$")))
            elif line.startswith("set "):
                m = re.match(r"set (\w+) \[stack (\d+)\]", line)
                if m: sv[m.group(1)] = st[-1 - int(m.group(2))] if len(st) > int(m.group(2)) else None
            elif line == "end_group" and depth:
                stacks.pop(); saved.pop(); depth -= 1
                grp = pending_groups.pop()
                stacks[-1].append(grp)
            continue
        cls, body = rest
        if cls in ("Root", "define_window_layout_xml"): continue
        k = knobs(body)
        if cls.startswith("clone"): cls = "Clone"
        # how many inputs this node takes from the stack ("2+1" = two inputs + a mask)
        ins = k.get("inputs")
        n_in = sum(int(x) for x in re.findall(r"\d+", ins)) if ins else 1
        taken = [st.pop() if st else None for _ in range(n_in)]
        idx = None
        if depth == 0:
            idx = len(nodes)
            x, y = num(k.get("xpos", "0")), num(k.get("ypos", "0"))
            tc = k.get("tile_color")
            node = {"c": cls, "n": unq(k.get("name", cls)), "x": round(x), "y": round(y)}
            if tc:
                try: node["t"] = int(unq(tc), 0) & 0xffffffff
                except Exception: pass
            lab = unq(k.get("label", "")) if k.get("label") else ""
            if lab and "[" not in lab and "/" not in lab and "\\" not in lab and len(lab) < 120: node["l"] = lab
            if unq(k.get("disable", "false")) == "true": node["d"] = 1
            if cls == "BackdropNode":
                b = {"x": round(x), "y": round(y), "w": round(num(k.get("bdwidth", "160"))), "h": round(num(k.get("bdheight", "120"))),
                     "l": lab, "fs": round(num(k.get("note_font_size", "14"))), "z": round(num(k.get("z_order", "0")))}
                if tc: b["t"] = node.get("t")
                backdrops.append(b); idx = ("bd", len(backdrops) - 1)
            elif cls == "StickyNote":
                notes.append({"x": round(x), "y": round(y), "l": lab, "fs": round(num(k.get("note_font_size", "14")))}); idx = ("sn",)
            else:
                nodes.append(node)
                if unq(k.get("hide_input", "false")) != "true":
                    for slot, src in enumerate(taken):
                        if isinstance(src, int): edges.append([src, idx, slot])
        me = idx if isinstance(idx, int) or depth else None
        if cls in ("Group", "LiveGroup"):
            pending_groups.append(me)
            stacks.append([]); saved.append({}); depth += 1
        else:
            st.append(me if depth == 0 and isinstance(idx, int) else None)
    return {"nodes": nodes, "edges": edges, "backdrops": backdrops, "notes": notes}

pending_groups = []
if __name__ == "__main__":
    data = convert(sys.argv[1])
    json.dump(data, open(sys.argv[2], "w"), separators=(",", ":"))
    print(len(data["nodes"]), "nodes,", len(data["edges"]), "connections,", len(data["backdrops"]), "backdrops,", len(data["notes"]), "notes")
