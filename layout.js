/** Positions words to communicate their hierarchy.

    Takes a mapping of JSON objects containing id, label, subconcepts, parents, and related fields.

    Outputs a JSON tree containing id, label, colour, scale, horizontal, x, & y
properties. The id field can be used to map back into the input, which can
be helpful for communicating those additional properties via interaction. */
function layoutVocab(vocab, bbox, title, font, fontHeight) {
  if (!title) title = "Vocabulary"
  if (!font) font = "bold 50px Arial"
  if (!fontHeight) fontHeight = 200; // MUST match font declaration

  var renderTree = {id: "", label: title, colour: "#000", horizontal: true,
        branches: []}

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

  var canvas = document.createElement("canvas").getContext("2d")
  canvas.font = font
  function scaleBranches(layer) {
    /* NOTE: The alternating orientations may cause some confusion here between
        width and height */
    // 1) Estimate width of all branches
    var branchWidth = 0
    for (var branch of layer.branches) branchWidth += scaleBranches(branch)
    branchWidth = branchWidth >> 1 // Since there are two sides to position along

    // 2) Have a branch choose a side, in order to finalize the width.
    layer.top = []; layer.bottom = []
    var topWidth = 0, bottomWidth = 0
    for (var branch of layer.branches) {
      if (branch.height + topWidth <= branchWidth) {
        layer.top.push(branch)
        topWidth += branch.height
      } else if (branch.height + bottomWidth <= branchWidth) {
        layer.bottom.push(branch)
        bottomWidth += branch.height
      } else {
        // We're overflowing, so choose the shorter side
        if (topWidth < bottomWidth) {
          layer.top.push(branch); topWidth += branch.height
        } else {
          layer.bottom.push(branch); bottomWidth += branch.height
        }
      }
    }
    branchWidth = Math.max(topWidth, bottomWidth)

    // 3) compute label size and the scaling factor for all branches
    var textSize = canvas.measureText(layer.label)
    layer.width = textSize.width
    // scale*branchWidth = textSize.width
    var scale = layer.width/branchWidth

    // 4) Apply scale to children
    for (var branch of layer.branches) branch.scale = scale

    // 5) Compute height
    var topWidth = 0
    for (var branch of layer.top)
        if (branch.width > topWidth) topWidth = branch.width
    var bottomWidth = 0
    for (var branch of layer.bottom)
        if (branch.width > bottomWidth) bottomWidth = branch.width
    layer.height = topWidth + fontHeight + bottomWidth

    return layer.height
  }

  function scaleRoot(layer, bbox) {
    layer.scale = Math.min(bbox.height/layer.height, bbox.width/layer.width)
  }

  function layoutBranches(layer) {
    /* This assumes scaling will be applied at render time,
        hence we just need to clarify a few layout properties. */
    layer.textTop = 0
    var x = 0
    for (var branch of layer.top) {
      branch.horizontal = !layer.horizontal
      if (branch.width > layer.textTop) layer.textTop = layer.width

      branch.x = x
      x += branch.height

      layoutBranches(branch)
    }

    layer.textBottom = layer.textTop + fontHeight
    x = 0
    for (var branch of layer.branches) {
      branch.horizontal = !layer.horizontal

      branch.x = x
      x += branch.height

      layoutBranches(branch)
    }
  }

  function scaleTextAndBBoxes(layer, parent, scale, rootx, rooty) {
    layer.scale *= scale
    layer.fontHeight = fontHeight * layer.scale

    layer.bbox = {x: rootx + layer.x*layer.scale, y: rooty,
        height: parent.textTop*parent.scale, width: layer.width*layer.scale}

    for (var branch of layer.branches) {
      scaleTextAndBBoxes(branch, layer, layer.scale, layer.bbox.y, layer.bbox.x)
    }
  }

  function positionPerpendicular(layer) {
    for (var branch of layer.top) {
      branch.bbox.y += branch.bbox.height - (branch.height*branch.scale)
      positionPerpendicular(branch)
    }
    for (var branch of layer.bottom) {
      branch.bbox.y += layer.textBottom * layer.scale
      positionPerpendicular(branch)
    }
  }

  function positionWords(layer) {
    layer.bbox.wordX = layer.bbox.x
    layer.bbox.wordY = layer.bbox.y + layer.wordTop * layer.scale

    for (var branch of layer.branches) positionWords(branch)
  }

  function reorientVertical(layer) {
    if (!layer.horizontal) {
      var bbox = layer.bbox
      layer.bbox = {x: bbox.y, y: bbox.x, height: bbox.width, width: bbox.height,
            wordX: bbox.wordY, wordY: bbox.wordX}

      var verticalLabel = ""
      for (var char of layer.label) verticalLabel += char + "\n"
      layer.label = verticalLabel
    }
    for (var branch of layer.branches) reorientVertical(branch)
  }

  function flattenRenderTree(layer, words) {
    words.append({
        label: layer.label, colour: layer.colour, fontHeight: layer.fontHeight,
        x: layer.bbox.wordX, y: layer.bbox.wordY,
        id: layer.id})

    for (var branch of branches) flattenRenderTree(branch, words)
    return words
  }

  scaleBranches(renderTree)
  layoutBranches(renderTree)
  //scaleRoot(renderTree, bbox)
  return renderTree
}
