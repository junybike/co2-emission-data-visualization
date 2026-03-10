export function createBarchart(data, onBrush){

	const svg = d3.select("#barchart");

	const w = +svg.attr("width");
	const h = +svg.attr("height");

	const margin = {top:40,right:20,bottom:80,left:50};

	const innerWidth = w - margin.left - margin.right;
	const innerHeight = h - margin.top - margin.bottom;

	const g = svg.append("g")
	.attr("transform", `translate(${margin.left}, ${margin.top})`);

	const x = d3.scaleBand()
	.domain(data.map(d => d.make))
	.range([0, innerWidth])
	.padding(0.2);

	const y = d3.scaleLinear()
	.domain([
	-d3.max(data,d => d.count),
	d3.max(data,d => d.avgCO2)
	])
	.range([innerHeight, 0]);

	g.append("g").call(d3.axisLeft(y));

	g.selectAll(".countBar")
	.data(data)
	.enter()
	.append("rect")
	.attr("x", d => x(d.make))
	.attr("width", x.bandwidth())
	.attr("y", y(0))
	.attr("height", d => y(-d.count) - y(0))
	.attr("fill", "steelblue");

	g.selectAll(".co2Bar")
	.data(data)
	.enter()
	.append("rect")
	.attr("x", d => x(d.make))
	.attr("width", x.bandwidth())
	.attr("y", d => y(d.avgCO2))
	.attr("height", d => y(0) - y(d.avgCO2))
	.attr("fill", "tomato");

	const brush = d3.brushX()
	.extent([[0, 0], [innerWidth, innerHeight]])
	.on("end", (event)=>{
		if (!event.selection) {
			onBrush(null);
			return;
		}

		const [x0, x1] = event.selection;
		const selected = data
		.filter(d => {
			const pos = x(d.make) + x.bandwidth()/2;
			return pos >= x0 && pos <= x1;
		})
		.map(d => d.make);

		onBrush(selected);
	});

	g.append("g")
	.attr("class", "brush")
	.call(brush);

}