export function bindSlider(sliderId, labelId) {

	const slider = d3.select(sliderId);
	const label = d3.select(labelId);

	label.text(slider.property("value"));

	slider.on("input", function() {
		label.text(this.value);
	});

}