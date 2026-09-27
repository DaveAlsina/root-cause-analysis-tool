# Uchuva RCA Workbench

An offline editor for the uchuva *Botrytis* root-cause analysis. No install and no internet needed.

## Start

1. Double-click `uchuva-rca.html`. It opens in your browser.
2. **File → Open** (Ctrl O) and choose `uchuva-rca.json`.
3. Edit, then **Ctrl S** to save.

Keep both files together, for example in your thesis repo. The `.json` is the RCA itself, with its version history inside. The `.html` is only the tool, so you can copy it anywhere.

## Saving, by browser

| Browser | Ctrl S |
|---|---|
| Chrome, Edge | Writes straight into the file you opened. |
| Firefox, Zen, Brave | Downloads a fresh `uchuva-rca.json`. Move it over the old one. |

Brave disables direct saving by default. If you want it there too, turn on `brave://flags/#file-system-access-api`.

Every change is also kept in the browser between sessions, so closing the tab does not lose work. It is still not a backup: save the file.

## Arrows

An arrow runs from an effect to the cause that explains it. Each step to the right answers "why?".

## Shortcuts

| Action | How |
|---|---|
| New box | Double-click empty space |
| Add a cause to the selected box | Tab |
| Edit text | Double-click the box, or Enter |
| Connect | Hover a box and drag the green dot onto its cause. Drop on empty space to create the cause there. |
| Rewire | Click an arrow, then drag one of its round ends to another box |
| Reverse the selected arrow | R |
| Delete | Del or Backspace. The rest of the chain stays as it is. |
| Select several | Shift-click |
| Fold a branch | F |
| Undo / redo | Ctrl Z / Ctrl Shift Z (or Ctrl Y) |
| Switch layout | L |
| Search | Ctrl F, then Enter to jump between matches |
| All shortcuts | ? |

## Categories (colour key)

The starting key:

| Colour | Category | Meaning |
|---|---|---|
| Yellow | Root problem | The problem being explained |
| Blue | Intermediate cause | A cause that has deeper causes below it |
| Grey | Root cause | The deepest causal point you could determine |
| Purple | Unsure | A cause you're not sure about; shades show the degree of doubt |
| Magenta | Open question | A gap in the chain still to investigate |

To change the key, use the **Categories** button, the Category dropdown on a box (**＋ New category…** or **Edit, delete or recolour categories…**), or **Edit** in the colour key on the canvas. In the editor you can:

- Add a category, name it, and pick its fill, outline and text colours.
- Give it a meaning. It shows when you hover over it in the colour key.
- Add lighter or darker shades, and reorder categories.
- Delete a category. If boxes still use it, you choose which category they move to. Ctrl Z undoes the whole change.

A category can also follow a rule. An *intermediate cause* should have deeper causes below it, and a *root cause* should end its chain. Boxes that break their rule appear under **Colour key checks** in the side panel.

## Citing from your .bib

Choose **File → Load bibliography…** and pick the `.bib` file you use for the thesis. The app keeps a copy in the browser, so you only do this once. After you change the `.bib`, load it again.

Type `@` in a box's Sources field to get suggestions:

- Each suggestion shows the key, the first author, the year and the title, so you can tell similar entries apart.
- The search covers the key, author surnames, year, title and journal. Type one word, no spaces, for example `@kan` or `@2019`.
- Use the arrow keys, then Enter or Tab, to insert `@key`, the same form a Typst citation uses.
- Under the field, every `@key` shows its full reference, or a warning if it isn't in your `.bib`.

## Untangle mode

This mode uses the Eclipse Layout Kernel's layered (Sugiyama) algorithm. The View panel shows the live crossing count and compares it with your own layout.

| Setting | What it does |
|---|---|
| Effort | Spends more effort minimising crossings, and at the higher settings keeps the best of up to 10 attempts. |
| Box placement | Compact, Balanced or Straight arrows. |
| Level and box spacing | Distance between columns, and between boxes in a column. |
| Arrow style | Right-angled, angled or straight. |
| Respect my vertical order | Keeps the order you gave the boxes in My layout. |
| Split shared causes | Draws a copy of a box under each box it explains, which removes the crossings shared causes create. A Roman numeral on each copy says how many times the box appears. "Repeat the full branch" also copies everything below it. |
| Keep these positions | Copies the untangled arrangement into My layout. |

These work in both layouts:

| Setting | What it does |
|---|---|
| Focus radius | Shows only boxes within 1 to 6 steps of the selected box. |
| Redundant arrows | Finds arrows already implied by a longer chain (transitive reduction), then shows, dashes or hides them. |

## Exports

| Format | Use |
|---|---|
| SVG | Vector picture for Typst: `#image("uchuva-rca.svg")` |
| PNG | Picture at 2× resolution |
| draw.io | Round-trips notes, sources and status |
| GraphML | networkx, Gephi or yEd |
| CSV | A table of boxes and a table of arrows |

The SVG and PNG show what is on screen, including the layout mode, folds and filters.

## Editing the tool

`source/` holds the app code: `src/app.js`, `src/app.css` and `src/app.html`. To rebuild the single file:

```
npm install
python3 build.py      # writes dist/uchuva-rca.html
```
