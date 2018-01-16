function renderVocab(words, $canvas) {
  var cloud = $canvas.style('position', 'absolute').selectAll('a')
                .data(words)

  cloud.exit().remove()

  cloud.enter().append('a').merge(cloud)
    .text((word) => word.label)
    .style('font', (word) => word.font)
    .style('color', (word) => word.colour)
    .style('text-align', 'justify')
    .style('position', 'absolute')
    .style('left', (word) => word.x)
    .style('top', (word) => word.y)
    .style('width', (word) => word.width)
    .style('height', (word) => word.height)
}
