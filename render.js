function renderVocab(words, $canvas, size) {
  var bgColour = '#fff'
  $canvas.style('position', 'relative')
        .style('width', size.width+'px').style('height', size.height+'px')
  var cloud = $canvas.selectAll('a').data(words)

  cloud.exit().remove()

  cloud.enter().append('a').merge(cloud)
    .text((word) => word.label)
    .style('font', (word) => word.font)
    .style('color', (word) => word.colour)
    .style('border-top', 'thin solid')
    .style('transform', (word) =>
        word.horizontal ? 'none' : 'rotate(90deg) translate(0, -' + word.fontSize + 'px)')
    .style('transform-origin', 'left top 0')
    .style('text-align', 'center')
    .style('position', 'absolute')
    .style('left', (word) => word.x + "px")
    .style('top', (word) => word.y + "px")
    .style('width', (word) => word.width)
    .style('height', (word) => word.height)
    .style('line-height', 1) // Just what seems to work
    .style('white-space', 'pre')
}
