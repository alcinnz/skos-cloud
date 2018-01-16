/** Positions words to communicate their hierarchy.

    Takes a mapping of JSON objects containing id, label, subconcepts, parents, and related fields.

    Outputs a JSON tree containing id, label, colour, scale, horizontal, x, & y
properties. The id field can be used to map back into the input, which can
be helpful for communicating those additional properties via interaction. */
function layoutVocab(vocab, bbox, title, font) {
  if (!bbox) bbox = {}
  if (!title) title = "Vocabulary"
  if (!font) font = {size: 100, minSize: 5, step: 10, style: "bold ? sans-serif"}

  var renderTree = {id: "", label: title, colour: "#000", branches: [], offset: 0}

  function buildRenderTree(concept) {
    var layer = {id: concept.id, label: concept.label, branches: []}
    layer.colour = "#f00" // TODO select a random hue
    for (var subconcept of concept.subconcepts)
      layer.branches.push(buildRenderTree(vocab[subconcept]))
    return layer
  }

  for (var id in vocab) {
    if (!vocab.hasOwnProperty(id) || vocab[id].subconcepts.length) continue
    var concept = concepts[id]
    renderTree.branches.push(buildRenderTree(concept))
  }

  if (renderTree.branches.length == 1) renderTree = renderTree.branches[0]

  function estimateLayout(layer, fontSize) {
    if (fontSize < font.minSize) {
        // Don't let text get unreadable, require interaction instead. 
        layer.parallelSize = layer.perpendicularSize = 0
        return
    }
    layer.fontSize = fontSize

    /**
     * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
     * 
     * @param {String} text The text to be rendered.
     * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
     * 
     * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
     */
    function getTextWidth(text, font) {
        // re-use canvas object for better performance
        var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        var context = canvas.getContext("2d");
        context.font = font;
        var metrics = context.measureText(text);
        return metrics.width;
    }

    // First pass length: sum of branches / 2
    var parallelSize = 0;
    for (var branch of layer.branches) {
      estimateLayout(branch, fontSize - font.step)
      parallelSize += branch.perpendicularSize
    }
    parallelSize >>= 1

    // Second pass length: ensure the branches fit
    // Since this is a NP-complete problem (the Knapsack problem),
    //      this only approximates a rough solution. 
    layer.top = []; layer.bottom = []
    var topSize = 0, bottomSize = 0
    for (var branch of layer.branches) {
      if (layer.perpendicularSize == 0) continue

      var combinedTop = topSize + branch.perpendicularSize
      var combinedBottom = bottomSize + branch.perpendicularSize
      if (combinedTop <= parallelSize) {
        branch.offset = topSize
        topSize = combinedTop
        layer.top.push(branch)
      } else if (combinedBottom <= parallelSize) {
        branch.offset = bottomSize
        bottomSize = combinedBottom
        layer.bottom.push(branch)
      } else {
        // Now minimize the excess length
        if (combinedTop < combinedBottom) {
          branch.offset = topSize
          topSize = combinedTop
          layer.top.push(branch)
        } else {
          branch.offset = bottomSize
          bottomSize = combinedBottom
          layer.bottom.push(branch)
        }
      }
    }
    layer.topLength = topSize; layer.bottomLength = bottomSize
    parallelSize = Math.max(topSize, bottomSize)

    // Third pass: Ensure text fits
    var textLength = getTextWidth(layer.label, font.style.replace("?", fontSize+"px"))
    layer.parallelSize = Math.max(textLength, parallelSize)

    // Compute perpendicular length
    topSize = bottomSize = 0
    for (var branch of layer.top) {
      if (branch.parallelSize > topSize) topSize = branch.parallelSize
    }
    for (var branch of layer.bottom) {
      if (branch.parallelSize > bottomSize) bottomSize = branch.parallelSize
    }
    layer.perpendicularSize = topSize + fontSize + bottomSize
    layer.topSize = topSize; layer.bottomSize = bottomSize
  }

  function finalizeLayout(layer) {
    var padding = (layer.parallelSize - layer.topLength)/layer.top.length
    var xoffset = 0
    for (var branch of layer.top) {
      branch.parallelSize = layer.topSize
      finalizeLayout(branch)
      branch.offset += xoffset
      xoffset += padding
    }

    padding = (layer.parallelSize - layer.bottomLength)/layer.bottom.length
    xoffset = 0
    for (var branch of layer.bottom) {
      branch.parallelSize = layer.bottomSize
      finalizeLayout(branch)
      branch.offset += xoffset
      xoffset += padding
    }
  }

  function positionWords(layer, horizontal, rootX, rootY) {
    if (horizontal) {
      layer.x = rootX
      layer.y = rootY + layer.offset + layer.topSize
      layer.width = layer.perpendicularSize
      layer.height = layer.parallelSize

      for (var branch of layer.top)
        positionWords(branch, !horizontal, rootX, rootY + layer.offset)
      for (var branch of layer.bottom)
        positionWords(branch, !horizontal, rootX, layer.y + layer.fontSize)
    } else {
      layer.x = rootX + layer.offset + layer.topSize
      layer.y = rootY
      layer.width = layer.parallelSize
      layer.height = layer.perpendicularSize

      for (var branch of layer.top)
        positionWords(branch, !horizontal, rootX + layer.offset, rootY)
      for (var branch of layer.bottom)
        positionWords(branch, !horizontal, layer.x + layer.fontSize, rootY)
    }
  }

  function flattenRenderTree(l, words) {
    if (l.parallelSize == 0) return words // These are marked as too-small to render

    words.push({id: l.id, label: l.label,
        font: font.style.replace("?", l.fontSize + "px"), colour: l.colour,
        x: l.x, y: l.y, width: l.width, height: l.height})
    for (var branch of l.branches) flattenRenderTree(branch, words)
    return words
  }

  estimateLayout(renderTree, font.size)
  finalizeLayout(renderTree)
  positionWords(renderTree, true, 0, 0)
  return flattenRenderTree(renderTree, [])
}
