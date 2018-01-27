//dims
const width  = 950, height = 700;
let geoData, meteorData;
//popup
const tooltip = d3.select('body').append('div')
										.attr('class','toolTip')//set important styling
										.style('opacity','0');//start off hidden

// set dims, make bkg, titles of graph
const svg = d3.select('body')
	.append('svg')
		.attr('width', width)
		.attr('height', height);
//bkg
svg.append('rect')
		.attr('class','chartBkg')
		.attr('width',width)
		.attr('height',height)
		// .attr('rx','15')
		// .attr('ry','15')
		;
//main group
const group = svg.append('g');//make a group within the svg to make use of margins from top left origin point of the group
//main title
svg.append('text')
		.attr('class', 'chartTitle')
		.text('Meteorite Landings')
		.attr('x', 5)
		.attr('y', 29);


//retrieve the data from somewhere, make error checks, then use it to finish setting up scales before making the graph
d3.json('resources/countries.geo.json', function(error,data){ //paths from script are from the displayed page
	if(error)console.log(error);//super important. display error if found!!
	//set data:
	geoData = data;
	console.log('geodata', data)
	//next data call
	d3.json('resources/data.json',function(error,data){
		if(error)console.log(error);//super important. display error if found!!
		// format data. in this case, toss items with null geometry/mass values, convert necessary strings to num, sort by mass descending to avoid inaccessible plots
		data.features = data.features.filter( item => item.geometry && item.properties.mass );
		data.features.forEach( d => { d.properties.mass = Number(d.properties.mass) } );
		data.features.sort( (a,b)=> b.properties.mass - a.properties.mass );
		//set data:
		meteorData = data;
		console.log('meteorites', data);
	//----------------------------------------------------------------------------------------------------------
		//finally, fire rest of code
		fire();
	});
});

function fire(){
	console.log('data loaded. intializing...');

	// fine tuning function for circle plot radius from mass
	function massToRadius(mass) {
		if (mass < 10000) //tiny cutoff
			return 1;
		else if (mass < 100000) //small limit
			return 2;
		else if (mass > 1000000)//huge cutoff
			return 16;
		else
			return massToRadiusMain(mass);//the rest can be scaled
	}
	//make scales
	massToRadiusMain = d3.scaleLinear()
		// .domain( d3.extent( meteorData.features, d => d.properties.mass ) )
		.domain( [100000,1000000] )
		.range([3,15]);
	console.log(massToRadiusMain.domain());
	
	// make and set projection object
	const mercatorProjection = d3.geoMercator()
			.scale(151)
			.center([0,20])//lat centering. first zero should not be changed
			// .rotate([20,0])//lon centering. second zero should not be changed
			.translate( [width/2,height/2] )//pixel offset, use to align center of graph to something
			;
	// bind geoData
	group.selectAll('.country')//empty selection
			.data(geoData.features)//returns update selection
		.enter().append('path')//appending path for each data point in enter selection
			.attr('fill', '#222')
			.attr('d', d3.geoPath().projection(mercatorProjection) );
	// bind meteorData, add circles of matching radius. from the meteor data, pass coordinates into the projection object, and you will get screen x y coordinates
	group.selectAll('.meteor')//empty selection
			.data(meteorData.features)//returns update selection
		.enter().append('circle')//appending path for each data point in enter selection
		// .filter( d => d.geometry === null ? false : true ) //already done above. data included null value geometry props, filter them out
			.style('opacity', 0.5 )
			.attr('fill', d => d3.interpolateRainbow( Math.random() ) )
			.attr('r', d => massToRadius(d.properties.mass) )
			.attr('cx', d => mercatorProjection( d.geometry.coordinates )[0] ) //pass in a [lat,lon] for current item to the projection object. you will get a [x,y]
			.attr('cy', d => mercatorProjection( d.geometry.coordinates )[1] )
			//event handling
			.on('mouseover', function(d,i){ //current datum and index
				// console.log(d);
				tooltip.html(`
						<span class='boldColor'>${ d.properties.name }</span> - ${ d.properties.year.slice(0,4) }<br>
						mass: ${ d.properties.mass.toLocaleString( undefined, {style:'decimal'} ) }<br>
						long: ${ d.geometry.coordinates[0].toFixed(2) } lat: ${ d.geometry.coordinates[1].toFixed(2) }<br>
						recclass: ${ d.properties.recclass }
					`)
					//DON'T FORGET TO OFFSET THE POPUP OR IT WILL INTERFERE, causing multiple event firing
					.style('left', d3.event.pageX + 15 + 'px')//d3.event must be used to access the usual event object
					.style('top', d3.event.pageY - 20 + 'px');
				tooltip.transition()//smooth transition, from d3: https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#transition
					.duration(500)//ms
					.style('opacity', 0.97);
				d3.select(this).style('opacity',0.9);
			})
			.on('mouseout', function(d,i){
				tooltip.style('opacity', 0)
					.style('top', '-150px');//throw off screen to prevent interference.still appears if just nuking opacity without transition
				d3.select(this).style('opacity',0.5);//reset opacity of plot
			});
	
	//enable pan and zoom on a selection. works with html, svg, canvas
	svg.call( //pick selection to fire event
		d3.zoom() //make zoom behaviour , it is an object/function
			.on("zoom", ()=> { //zoom event handles many types of zooms
					group.attr("transform", d3.event.transform) //magic
				}
			)
	);
}