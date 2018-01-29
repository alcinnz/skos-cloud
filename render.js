function renderVocab(words, $canvas, size, vocab = {}) {
  var bgColour = '#fff'
  $canvas.style('position', 'relative')
        .style('width', size.width+'px').style('height', size.height+'px')
  var cloud = $canvas.selectAll('a').data(words)

  cloud.exit().remove()

  cloud.enter().append('a').merge(cloud)
    .text((word) => word.label)
    .attr('data-id', (word) => word.id)
    .style('font', (word) => word.font)
    .style('color', (word) => word.colour)
    .style('border-top-style', 'solid').style('border-top-width', 'thin')
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
    .style('cursor', 'default')

    .on('mouseover', function(evt) {
      var my_id = d3.select(this).classed('skos-hover', true).attr('data-id')
      for (var id of vocab[my_id].parents) {
        d3.select('[data-id="'+id+'"]').classed('skos-parent', true)
      }

      for (var id of vocab[my_id].related) {
        d3.select('[data-id="'+id+'"]').classed('skos-related', true)
      }
    })
    .on('mouseout', (evt) => {
      d3.selectAll('.skos-hover').classed('skos-hover', false)
      d3.selectAll('.skos-parent').classed('skos-parent', false)
      d3.selectAll('.skos-related').classed('skos-related', false)
    })
}
