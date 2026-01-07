const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../election-app/public/data');

// Read the files
const divisions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bd-divisions.json'), 'utf8'));
const districts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bd-districts.json'), 'utf8'));
const upazilasData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bd-upazilas.json'), 'utf8'));

// The upazilas file has a "upazilas" key with the array.
const upazilas = upazilasData.upazilas;

// Goal: Create 300 Seats.
const seats = [];
const pollingCenters = [];

// Helper to look up Division/District names
const districtMap = {};
districts.districts.forEach(d => {
    districtMap[d.id] = {
        name: d.name,
        division_id: d.division_id,
        lat: d.lat,
        long: d.long
    };
});

const divisionMap = {};
divisions.divisions.forEach(d => {
    divisionMap[d.id] = d.name;
});


function generatePollingCenters(upazilaName, lat, lng, division, district, seatId) {
    const centers = [];
    if (!lat || !lng) return []; // Skip if no coordinates

    for (let i = 1; i <= 5; i++) {
        // Jitter ~ 0.05 degrees (approx 5km range) to spread them out around the district center
        // Since we are using district center, we need larger jitter to cover the area.
        const centerLat = parseFloat(lat) + (Math.random() - 0.5) * 0.15;
        const centerLng = parseFloat(lng) + (Math.random() - 0.5) * 0.15;

        centers.push({
            id: `pc-${seatId}-${upazilaName}-${i}`.replace(/[\s\(\),]+/g, '-').toLowerCase(),
            name: `${upazilaName} Center ${i}`,
            division,
            district,
            upazila: upazilaName,
            seatId: seatId,
            lat: centerLat,
            lng: centerLng,
            voteStatus: {
                "Awami League": Math.floor(Math.random() * 1000),
                "BNP": Math.floor(Math.random() * 1000),
                "Jatiya Party": Math.floor(Math.random() * 500),
                "Others": Math.floor(Math.random() * 200)
            }
        });
    }
    return centers;
}


// Assign each upazila to a seat (1-300)
const seatMap = {}; // seatId -> { name, upazilas: [], district, division }

upazilas.forEach((upazila, index) => {

    // Seat ID mapping: simplified
    const seatId = Math.floor((index * 300) / upazilas.length) + 1;
    const seatKey = `Seat-${seatId}`;

    const distInfo = districtMap[upazila.district_id];
    const divisionName = distInfo ? divisionMap[distInfo.division_id] : "Unknown";
    const districtName = distInfo ? distInfo.name : "Unknown";

    if (!seatMap[seatKey]) {
        seatMap[seatKey] = {
            id: seatKey,
            name: `${districtName} Seat ${seatId}`, // Dummy name
            division: divisionName,
            district: districtName,
            upazilas: []
        };
    }

    seatMap[seatKey].upazilas.push(upazila.name);

    // Use District Lat/Long as base
    let lat = distInfo ? distInfo.lat : "23.6850";
    let lng = distInfo ? distInfo.long : "90.3563";

    const centers = generatePollingCenters(upazila.name, lat, lng, divisionName, districtName, seatKey);
    pollingCenters.push(...centers);
});

// Convert seatMap to array
const finalSeats = Object.values(seatMap);

fs.writeFileSync(path.join(DATA_DIR, 'bd-seats.json'), JSON.stringify(finalSeats, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'bd-polling-centers.json'), JSON.stringify(pollingCenters, null, 2));

console.log(`Generated ${finalSeats.length} seats and ${pollingCenters.length} polling centers.`);
