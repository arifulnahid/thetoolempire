/* ── GIS Projection Finder — Alpine component ── */

/* ── Projection database ── */
const PROJECTIONS = [
  /* ── Global geographic ── */
  {
    epsg: 4326, name: 'WGS 84', type: 'geographic', units: 'degrees',
    region: 'Global', area: 'World',
    proj4: '+proj=longlat +datum=WGS84 +no_defs',
    wkt: 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',
    usedIn: 'GPS, Google Maps, OpenStreetMap, GeoJSON standard, most web mapping APIs',
    notes: 'The default geographic CRS for virtually all modern geospatial data. Coordinates are longitude/latitude in decimal degrees.',
    tags: ['global','gps','web','geojson'],
  },
  {
    epsg: 4269, name: 'NAD83', type: 'geographic', units: 'degrees',
    region: 'North America', area: 'USA, Canada',
    proj4: '+proj=longlat +datum=NAD83 +no_defs',
    wkt: 'GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]]',
    usedIn: 'US federal agencies, USGS, Census TIGER files, state GIS portals',
    notes: 'Nearly identical to WGS 84 for most practical purposes. Standard datum for North American federal mapping.',
    tags: ['north america','usa','federal','nad'],
  },
  {
    epsg: 4267, name: 'NAD27', type: 'geographic', units: 'degrees',
    region: 'North America', area: 'USA, Canada',
    proj4: '+proj=longlat +datum=NAD27 +no_defs',
    wkt: 'GEOGCS["NAD27",DATUM["North_American_Datum_1927",SPHEROID["Clarke 1866",6378206.4,294.978698213898]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4267"]]',
    usedIn: 'Legacy USGS topo maps, older US government data',
    notes: 'Older US datum based on Clarke 1866 ellipsoid. Often needs transformation to NAD83/WGS 84 for modern use. Offsets can be 10–100m.',
    tags: ['north america','usa','legacy','nad'],
  },
  {
    epsg: 4258, name: 'ETRS89', type: 'geographic', units: 'degrees',
    region: 'Europe', area: 'Europe',
    proj4: '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs',
    wkt: 'GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4258"]]',
    usedIn: 'European spatial data infrastructure (INSPIRE directive), EU agencies, Eurostat',
    notes: 'European standard geographic CRS. Coincides with ITRS at the epoch 1989.0. Effectively the same as WGS 84 for most purposes.',
    tags: ['europe','inspire','eu'],
  },
  /* ── Web Mercator ── */
  {
    epsg: 3857, name: 'WGS 84 / Pseudo-Mercator (Web Mercator)', type: 'projected', units: 'metres',
    region: 'Global', area: 'World (web mapping)',
    proj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs',
    wkt: 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","3857"]]',
    usedIn: 'Google Maps, OpenStreetMap, Bing Maps, ESRI online basemaps, Mapbox, Leaflet tile layers',
    notes: 'Treats Earth as a sphere, causing significant distortion near poles. Not suitable for area or distance calculations. Also known as EPSG:900913.',
    tags: ['global','web','mercator','tile','google','osm'],
  },
  /* ── UTM zones ── */
  {
    epsg: 32632, name: 'WGS 84 / UTM zone 32N', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Germany, Italy, Central Europe (6°E–12°E)',
    proj4: '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 32N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",9],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","32632"]]',
    usedIn: 'European topographic surveys, Germany national mapping, Italian GIS',
    notes: 'Part of the Universal Transverse Mercator grid system. Good for accurate distance/area measurements in Central Europe.',
    tags: ['utm','europe','germany','italy','projected'],
  },
  {
    epsg: 32633, name: 'WGS 84 / UTM zone 33N', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Eastern Europe, Scandinavia (12°E–18°E)',
    proj4: '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 33N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",15],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","32633"]]',
    usedIn: 'Eastern Europe topographic mapping, Austria, Czech Republic, Poland',
    notes: 'UTM zone covering 12°E to 18°E longitude, central meridian at 15°E.',
    tags: ['utm','europe','projected'],
  },
  {
    epsg: 32618, name: 'WGS 84 / UTM zone 18N', type: 'projected', units: 'metres',
    region: 'North America', area: 'Eastern USA, East Coast (72°W–66°W)',
    proj4: '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 18N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-75],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","32618"]]',
    usedIn: 'New York, Boston, Washington D.C. area GIS',
    notes: 'Central meridian at 75°W. Covers East Coast US states including New York and New England.',
    tags: ['utm','usa','north america','projected'],
  },
  {
    epsg: 32614, name: 'WGS 84 / UTM zone 14N', type: 'projected', units: 'metres',
    region: 'North America', area: 'Central USA (102°W–96°W)',
    proj4: '+proj=utm +zone=14 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 14N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-99],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","32614"]]',
    usedIn: 'Kansas, Oklahoma, Texas panhandle GIS',
    notes: 'Central meridian at 99°W. Covers the central Great Plains region.',
    tags: ['utm','usa','north america','projected'],
  },
  {
    epsg: 32610, name: 'WGS 84 / UTM zone 10N', type: 'projected', units: 'metres',
    region: 'North America', area: 'Western USA (126°W–120°W)',
    proj4: '+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 10N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-123],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","32610"]]',
    usedIn: 'California (northern), Oregon, Washington state GIS',
    notes: 'Central meridian at 123°W. Covers most of the Pacific Northwest and Northern California.',
    tags: ['utm','usa','california','pacific','projected'],
  },
  {
    epsg: 32754, name: 'WGS 84 / UTM zone 54S', type: 'projected', units: 'metres',
    region: 'Oceania', area: 'Eastern Australia (138°E–144°E)',
    proj4: '+proj=utm +zone=54 +south +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 54S",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",141],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",10000000],UNIT["metre",1],AUTHORITY["EPSG","32754"]]',
    usedIn: 'South Australia, parts of Queensland',
    notes: 'Southern hemisphere UTM. False northing of 10,000,000m to avoid negative northing values.',
    tags: ['utm','australia','oceania','projected'],
  },
  /* ── US State Plane ── */
  {
    epsg: 2263, name: 'NAD83 / New York Long Island (ftUS)', type: 'projected', units: 'US survey feet',
    region: 'North America', area: 'New York City, Long Island',
    proj4: '+proj=lcc +lat_1=41.03333333333333 +lat_2=40.66666666666666 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000.0000000001 +y_0=0 +datum=NAD83 +units=us-ft +no_defs',
    wkt: 'PROJCS["NAD83 / New York Long Island",GEOGCS["NAD83",...],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",41.0333333333],PARAMETER["standard_parallel_2",40.6666666666],PARAMETER["latitude_of_origin",40.1666666666],PARAMETER["central_meridian",-74],PARAMETER["false_easting",300000],PARAMETER["false_northing",0],UNIT["US survey foot",0.3048006096012192],AUTHORITY["EPSG","2263"]]',
    usedIn: 'New York City agencies, NYC Open Data, ConEd GIS',
    notes: 'Lambert Conformal Conic. Units are US survey feet, not metres. Required for NYC government spatial data compliance.',
    tags: ['state plane','usa','new york','nyc','lcc','feet'],
  },
  {
    epsg: 2229, name: 'NAD83 / California zone 5 (ftUS)', type: 'projected', units: 'US survey feet',
    region: 'North America', area: 'Los Angeles, Southern California',
    proj4: '+proj=lcc +lat_1=35.46666666666667 +lat_2=34.03333333333333 +lat_0=33.5 +lon_0=-118 +x_0=2000000.0001016 +y_0=500000.0001016001 +datum=NAD83 +units=us-ft +no_defs',
    wkt: 'PROJCS["NAD83 / California zone 5",GEOGCS["NAD83",...],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",35.4666666666],PARAMETER["standard_parallel_2",34.0333333333],PARAMETER["latitude_of_origin",33.5],PARAMETER["central_meridian",-118],PARAMETER["false_easting",2000000],PARAMETER["false_northing",500000],UNIT["US survey foot",0.3048006096012192],AUTHORITY["EPSG","2229"]]',
    usedIn: 'LA County GIS, Southern California government agencies',
    notes: 'Lambert Conformal Conic in US survey feet. Standard for LA County and surrounding area spatial data.',
    tags: ['state plane','usa','california','los angeles','lcc','feet'],
  },
  {
    epsg: 6340, name: 'NAD83(2011) / Texas Central', type: 'projected', units: 'metres',
    region: 'North America', area: 'Central Texas',
    proj4: '+proj=lcc +lat_1=31.88333333333333 +lat_2=30.11666666666667 +lat_0=29.66666666666667 +lon_0=-100.3333333333333 +x_0=700000 +y_0=3000000 +ellps=GRS80 +units=m +no_defs',
    wkt: 'PROJCS["NAD83(2011) / Texas Central",GEOGCS["NAD83(2011)",...],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",31.8833333333],PARAMETER["standard_parallel_2",30.1166666666],PARAMETER["latitude_of_origin",29.6666666666],PARAMETER["central_meridian",-100.333333333],UNIT["metre",1],AUTHORITY["EPSG","6340"]]',
    usedIn: 'Texas state agencies, Austin area GIS',
    notes: 'Uses the 2011 adjustment of NAD83. Metres units unlike many US State Plane zones.',
    tags: ['state plane','usa','texas','lcc'],
  },
  /* ── National projections ── */
  {
    epsg: 27700, name: 'OSGB 1936 / British National Grid', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Great Britain',
    proj4: '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +datum=OSGB36 +units=m +no_defs',
    wkt: 'PROJCS["OSGB 1936 / British National Grid",GEOGCS["OSGB 1936",DATUM["OSGB_1936",SPHEROID["Airy 1830",6377563.396,299.3249646]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",49],PARAMETER["central_meridian",-2],PARAMETER["scale_factor",0.9996012717],PARAMETER["false_easting",400000],PARAMETER["false_northing",-100000],UNIT["metre",1],AUTHORITY["EPSG","27700"]]',
    usedIn: 'Ordnance Survey, UK government open data, Environment Agency, OS OpenData',
    notes: 'The standard CRS for all British national mapping. Based on Airy 1830 ellipsoid. Easting/Northing in metres from a false origin SW of the Scilly Isles.',
    tags: ['uk','great britain','national grid','tmerc','europe'],
  },
  {
    epsg: 25832, name: 'ETRS89 / UTM zone 32N', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Germany, Central Europe',
    proj4: '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    wkt: 'PROJCS["ETRS89 / UTM zone 32N",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",9],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","25832"]]',
    usedIn: 'German national mapping (BKG), INSPIRE datasets in Central Europe',
    notes: 'ETRS89-based UTM — preferred over WGS84/UTM in European official data. Stable relative to the stable part of the European tectonic plate.',
    tags: ['utm','europe','germany','etrs89','projected'],
  },
  {
    epsg: 2154, name: 'RGF93 / Lambert-93', type: 'projected', units: 'metres',
    region: 'Europe', area: 'France',
    proj4: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    wkt: 'PROJCS["RGF93 / Lambert-93",GEOGCS["RGF93",...],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],UNIT["metre",1],AUTHORITY["EPSG","2154"]]',
    usedIn: 'IGN France, French national open data, French government GIS',
    notes: 'Official national projection of France since 2001, replacing Lambert Zone II Extended. Lambert Conformal Conic on GRS80 ellipsoid.',
    tags: ['france','europe','lcc','lambert','national'],
  },
  {
    epsg: 28992, name: 'Amersfoort / RD New', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Netherlands',
    proj4: '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs',
    wkt: 'PROJCS["Amersfoort / RD New",GEOGCS["Amersfoort",...],PROJECTION["Oblique_Stereographic"],PARAMETER["latitude_of_origin",52.1561605555555],PARAMETER["central_meridian",5.38763888888889],PARAMETER["scale_factor",0.9999079],PARAMETER["false_easting",155000],PARAMETER["false_northing",463000],UNIT["metre",1],AUTHORITY["EPSG","28992"]]',
    usedIn: 'Netherlands Kadaster, Dutch open geo-data, BAG (addresses & buildings)',
    notes: 'Oblique Stereographic projection on Bessel 1841 ellipsoid. Unique to the Netherlands and highly optimised for that country\'s shape.',
    tags: ['netherlands','europe','stereographic','national'],
  },
  {
    epsg: 3006, name: 'SWEREF99 TM', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Sweden',
    proj4: '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    wkt: 'PROJCS["SWEREF99 TM",GEOGCS["SWEREF99",DATUM["SWEREF99",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",15],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","3006"]]',
    usedIn: 'Lantmäteriet (Swedish mapping authority), Swedish open geodata',
    notes: 'Official national projection of Sweden. Based on ETRS89/GRS80 — a single transverse Mercator zone covering all of Sweden.',
    tags: ['sweden','europe','utm','tmerc','national'],
  },
  {
    epsg: 5514, name: 'S-JTSK / Krovak East North', type: 'projected', units: 'metres',
    region: 'Europe', area: 'Czech Republic, Slovakia',
    proj4: '+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs',
    wkt: 'PROJCS["S-JTSK / Krovak East North",...,PROJECTION["Krovak"],UNIT["metre",1],AUTHORITY["EPSG","5514"]]',
    usedIn: 'Czech RÚIAN, Slovak national cadaster, Central European legacy GIS',
    notes: 'Krovak oblique conic conformal. Originally axes pointed south/west; East North variant has positive axes eastward/northward for easier GIS use.',
    tags: ['czech','slovakia','europe','krovak','national'],
  },
  {
    epsg: 32654, name: 'WGS 84 / UTM zone 54N', type: 'projected', units: 'metres',
    region: 'Asia', area: 'Japan (138°E–144°E)',
    proj4: '+proj=utm +zone=54 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / UTM zone 54N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",141],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1],AUTHORITY["EPSG","32654"]]',
    usedIn: 'Japan topographic mapping (covers Tokyo area)',
    notes: 'Covers central Honshu including Tokyo. Japan also uses its own JGD2011 system.',
    tags: ['utm','japan','asia','projected'],
  },
  {
    epsg: 3414, name: 'SVY21 / Singapore TM', type: 'projected', units: 'metres',
    region: 'Asia', area: 'Singapore',
    proj4: '+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["SVY21 / Singapore TM",GEOGCS["SVY21",...],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",1.36666666666667],PARAMETER["central_meridian",103.833333333333],PARAMETER["scale_factor",1],UNIT["metre",1],AUTHORITY["EPSG","3414"]]',
    usedIn: 'Singapore Land Authority (SLA), OneMap, Singapore government GIS',
    notes: 'Official national projection of Singapore. Scale factor of 1.0 (no distortion at central meridian). Very high-accuracy system.',
    tags: ['singapore','asia','tmerc','national'],
  },
  {
    epsg: 7844, name: 'GDA2020', type: 'geographic', units: 'degrees',
    region: 'Oceania', area: 'Australia',
    proj4: '+proj=longlat +ellps=GRS80 +no_defs',
    wkt: 'GEOGCS["GDA2020",DATUM["GDA2020",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","7844"]]',
    usedIn: 'Geoscience Australia, PSMA, state surveying authorities since 2020',
    notes: 'Replaced GDA94 as the Australian national datum. Based on ITRF2014 at epoch 2020. Coordinates differ from GDA94 by ~1.8m.',
    tags: ['australia','oceania','geographic'],
  },
  {
    epsg: 3577, name: 'GDA94 / Australian Albers', type: 'projected', units: 'metres',
    region: 'Oceania', area: 'Australia',
    proj4: '+proj=aea +lat_1=-18 +lat_2=-36 +lat_0=0 +lon_0=132 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    wkt: 'PROJCS["GDA94 / Australian Albers",GEOGCS["GDA94",...],PROJECTION["Albers_Conic_Equal_Area"],PARAMETER["standard_parallel_1",-18],PARAMETER["standard_parallel_2",-36],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",132],UNIT["metre",1],AUTHORITY["EPSG","3577"]]',
    usedIn: 'ABARES, Bureau of Statistics, CSIRO national datasets, Geoscience Australia',
    notes: 'Equal-area projection for all-Australia maps and analysis. Preserves areas, not shapes. Standard for national-scale Australian thematic mapping.',
    tags: ['australia','oceania','albers','equal area','national'],
  },
  {
    epsg: 4559, name: 'RRAF 1991 / UTM zone 20N', type: 'projected', units: 'metres',
    region: 'Americas', area: 'French Caribbean (Martinique, Guadeloupe)',
    proj4: '+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    wkt: 'PROJCS["RRAF 1991 / UTM zone 20N",...,UNIT["metre",1],AUTHORITY["EPSG","4559"]]',
    usedIn: 'IGN France overseas departments, French Caribbean official mapping',
    notes: 'Official CRS for the French Antilles (Martinique and Guadeloupe). Replaced Fort Desaix and Sainte Anne datums.',
    tags: ['caribbean','france','utm','projected'],
  },
  /* ── Equal area / specialty ── */
  {
    epsg: 6933, name: 'WGS 84 / NSIDC EASE-Grid 2.0 Global', type: 'projected', units: 'metres',
    region: 'Global', area: 'Global (equal area)',
    proj4: '+proj=cea +lon_0=0 +lat_ts=30 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / NSIDC EASE-Grid 2.0 Global",...,PROJECTION["Cylindrical_Equal_Area"],UNIT["metre",1],AUTHORITY["EPSG","6933"]]',
    usedIn: 'NASA NSIDC sea-ice, soil moisture, vegetation remote sensing products',
    notes: 'Equal-area cylindrical. Preserves area for global raster analysis. Standard for many satellite-derived environmental datasets.',
    tags: ['global','equal area','remote sensing','nasa','raster'],
  },
  {
    epsg: 54009, name: 'World Mollweide', type: 'projected', units: 'metres',
    region: 'Global', area: 'World',
    proj4: '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["World_Mollweide",...,PROJECTION["Mollweide"],UNIT["metre",1]]',
    usedIn: 'Thematic world maps, cartography, National Geographic atlas maps',
    notes: 'Pseudo-cylindrical equal-area projection. Preserves relative areas, not shapes. Popular for displaying global phenomena like population density or deforestation.',
    tags: ['global','equal area','cartography','mollweide'],
  },
  {
    epsg: 54030, name: 'World Robinson', type: 'projected', units: 'metres',
    region: 'Global', area: 'World',
    proj4: '+proj=robin +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["World_Robinson",...,PROJECTION["Robinson"],UNIT["metre",1]]',
    usedIn: 'World reference maps, National Geographic (1988–1998), textbook world maps',
    notes: 'Compromise projection — neither equal-area nor conformal, but minimises both distortions. Aesthetically pleasing for world maps.',
    tags: ['global','cartography','robinson','compromise'],
  },
  /* ── Polar ── */
  {
    epsg: 3031, name: 'WGS 84 / Antarctic Polar Stereographic', type: 'projected', units: 'metres',
    region: 'Polar', area: 'Antarctica',
    proj4: '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / Antarctic Polar Stereographic",...,PROJECTION["Polar_Stereographic"],PARAMETER["straight_vertical_longitude_from_pole",0],PARAMETER["latitude_of_origin",-90],UNIT["metre",1],AUTHORITY["EPSG","3031"]]',
    usedIn: 'SCAR, NSIDC Antarctic data, British Antarctic Survey, ice sheet models',
    notes: 'Standard projection for Antarctic data. True scale at 71°S. Meridians radiate from the South Pole.',
    tags: ['polar','antarctica','stereographic','projected'],
  },
  {
    epsg: 3413, name: 'WGS 84 / NSIDC Sea Ice Polar Stereographic North', type: 'projected', units: 'metres',
    region: 'Polar', area: 'Arctic',
    proj4: '+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    wkt: 'PROJCS["WGS 84 / NSIDC Sea Ice Polar Stereographic North",...,PROJECTION["Polar_Stereographic"],PARAMETER["latitude_of_origin",90],PARAMETER["standard_parallel",70],UNIT["metre",1],AUTHORITY["EPSG","3413"]]',
    usedIn: 'NSIDC Arctic sea ice extent, Arctic climate datasets',
    notes: 'True scale at 70°N. Central meridian at 45°W to balance distortion across the Arctic Ocean.',
    tags: ['polar','arctic','stereographic','nsidc','projected'],
  },
];

/* ── Alpine component ── */
function projectionFinderApp() {
  return {
    query: '',
    filterType: 'all',   /* 'all' | 'geographic' | 'projected' */
    filterRegion: 'all',
    results: [],
    expanded: null,      /* epsg code of open result */

    init() {
      this.results = PROJECTIONS;
    },

    get regions() {
      const s = new Set(PROJECTIONS.map(p => p.region));
      return ['all', ...Array.from(s).sort()];
    },

    search() {
      const q = this.query.trim().toLowerCase();
      this.results = PROJECTIONS.filter(p => {
        const matchType   = this.filterType === 'all' || p.type === this.filterType;
        const matchRegion = this.filterRegion === 'all' || p.region === this.filterRegion;
        if (!matchType || !matchRegion) return false;
        if (!q) return true;
        return (
          String(p.epsg).includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q) ||
          (p.usedIn && p.usedIn.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some(t => t.includes(q)))
        );
      });
    },

    toggleExpand(epsg) {
      this.expanded = this.expanded === epsg ? null : epsg;
    },

    loadPopular(epsg) {
      this.query = String(epsg);
      this.filterType = 'all';
      this.filterRegion = 'all';
      this.search();
      this.expanded = epsg;
      this.$nextTick(() => {
        const el = document.getElementById('results-top');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    async copyText(text, label) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      this._toast(`Copied ${label}`);
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
