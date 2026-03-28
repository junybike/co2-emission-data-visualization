# co2 emission data visualization

## to run
```bash
python3 -m http.server 8000
```

Then, enter your browser and navigate to `http://localhost:8000`

## main.js

Loads data into local lists

Connects with
- random 10 sample button
- reset button
- add custom car button

## barchart.js

Builds the bar chart
Drag and select feature included

## scatter.js

Builds the scatter plot  
Updates the data according to the random 10 sample button, reset button, and add custom car button  
Circle opcacity changes during the bar chart interaction (highlightMakes())

## data.js

Includes helper function  
- sampling 10 data
- normalizeClass: for parsing vehicle class when choosing vehicle class in interaction: build a custom car
- carMatch: gets a similar car from the data during interaction: build a custom car

## interaction.js

To connect sliders for the interaction: build a custom car
