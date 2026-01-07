'use client';

import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';

interface MapProps {
    onSelectLocation: (type: string, data: any) => void;
    viewMode: 'division' | 'district' | 'upazila' | 'seat';
    voteData: any;
    seatsMeta: any[];
    upazilaToSeatMap: any;
    activeBounds?: any; // Controlled bounds
}

function MapController({ onZoom, activeBounds }: { onZoom: (z: number) => void, activeBounds: any }) {
    const map = useMap();
    useMapEvents({
        zoomend: () => {
            onZoom(map.getZoom());
        },
    });

    useEffect(() => {
        if (activeBounds) {
            map.fitBounds(activeBounds, { padding: [50, 50] });
        }
    }, [activeBounds, map]);

    return null;
}

// Custom Marker Icon
const markerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Color generation helper
const getColor = (id: string | number) => {
    // Simple hash function to get consistent color from ID
    let str = String(id);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

export default function ElectionMap({ onSelectLocation, viewMode, voteData, seatsMeta, upazilaToSeatMap, activeBounds }: MapProps) {
    const [geoData, setGeoData] = useState<any>(null);
    const [pollingCenters, setPollingCenters] = useState<any[]>([]);
    const [zoomLevel, setZoomLevel] = useState(7);
    const [hoveredFeature, setHoveredFeature] = useState<any>(null);

    useEffect(() => {
        // Load Base Geo Data
        Promise.all([
            fetch('/data/bangladesh.geojson').then(r => r.json()),
            fetch('/data/bd-polling-centers.json').then(r => r.json()),
        ]).then(([geo, centers]) => {
             setGeoData(geo);
             setPollingCenters(centers);
        });
    }, []);

    const getFeatureStyle = (feature: any) => {
        const props = feature.properties;
        let fillColor = '#e2e8f0';
        let fillOpacity = 0.6;
        let color = 'white';
        let weight = 1;

        // "CSP" - Distinct Color logic
        if (viewMode === 'division') {
            // ID_1 is Division ID usually
            if (props.ID_1) fillColor = getColor(props.ID_1);
            else if (props.NAME_1) fillColor = getColor(props.NAME_1);
        }
        else if (viewMode === 'district') {
             // ID_2 is District ID
             if (props.ID_2) fillColor = getColor(props.ID_2);
             else if (props.NAME_2) fillColor = getColor(props.NAME_2);
        }
        else if (viewMode === 'upazila') {
             // ID_3 is Upazila ID
             if (props.ID_3) fillColor = getColor(props.ID_3);
             else if (props.NAME_3) fillColor = getColor(props.NAME_3);
        }
        else if (viewMode === 'seat') {
            // Seat Logic (Vote Based or distinct seat based)
             const namesToCheck = [props.NAME_4, props.NAME_3, props.name].filter(Boolean);
            let seat = null;

            for (const name of namesToCheck) {
                const norm = name.toLowerCase().replace(/upazila/g, '').replace(/sadar/g, '').replace(/\./g, '').trim();
                if (upazilaToSeatMap[norm]) {
                    seat = upazilaToSeatMap[norm];
                    break;
                }
                 const found = Object.values(upazilaToSeatMap).find((s: any) =>
                    s.upazilas.some((u: string) => u.toLowerCase().includes(norm) || norm.includes(u.toLowerCase()))
                );
                if (found) {
                    seat = found;
                    break;
                }
            }

            if (seat && voteData && voteData[seat.id]) {
                const votes = voteData[seat.id];
                let winner = null;
                let maxVotes = -1;
                for (const [party, count] of Object.entries(votes)) {
                    if ((count as number) > maxVotes) {
                        maxVotes = count as number;
                        winner = party;
                    }
                }
                if (winner === 'Awami League') fillColor = '#22c55e'; // Green
                else if (winner === 'BNP') fillColor = '#374151'; // Dark Gray
                else if (winner === 'Jatiya Party') fillColor = '#eab308'; // Yellow
                else if (winner === 'Others') fillColor = '#60a5fa'; // Blue
                fillOpacity = 0.8;
            } else if (seat) {
                // If no vote data, just distinct color for seat
                fillColor = getColor(seat.id);
            }
        }

        return {
            fillColor: fillColor,
            weight: weight,
            opacity: 1,
            color: color,
            dashArray: viewMode === 'seat' ? '3' : '',
            fillOpacity: fillOpacity
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        layer.on({
            mouseover: (e: any) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 3,
                    color: '#666',
                    fillOpacity: 0.9
                });
                setHoveredFeature(feature.properties);
            },
            mouseout: (e: any) => {
                const style = getFeatureStyle(feature);
                layer.setStyle(style);
                setHoveredFeature(null);
            },
            click: (e: any) => {
                // Pass event to parent to handle selection & bounds calculation
                onSelectLocation('feature', feature.properties);
            }
        });
    };

    if (!geoData) return <div className="h-full flex items-center justify-center text-gray-500">Loading Map Data...</div>;

    return (
        <MapContainer center={[23.6850, 90.3563]} zoom={7} scrollWheelZoom={true} className="h-full w-full outline-none">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <MapController onZoom={setZoomLevel} activeBounds={activeBounds} />

            {geoData && (
                <GeoJSON
                    key={viewMode}
                    data={geoData}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                />
            )}

            {/* Show Polling Centers when zoomed in */}
            {zoomLevel > 10 && pollingCenters.map((center) => (
                <Marker
                    key={center.id}
                    position={[center.lat, center.lng]}
                    icon={markerIcon}
                >
                    <Popup>
                        <div className="p-2 min-w-[200px]">
                            <h3 className="font-bold text-sm">{center.name}</h3>
                            <p className="text-xs text-gray-500">{center.upazila}, {center.district}</p>
                            <div className="mt-2 text-xs border-t pt-2">
                                <p className="font-semibold mb-1">Local Center Count:</p>
                                <div className="flex justify-between"><span>AL:</span> <b>{center.voteStatus['Awami League']}</b></div>
                                <div className="flex justify-between"><span>BNP:</span> <b>{center.voteStatus['BNP']}</b></div>
                                <div className="flex justify-between"><span>JP:</span> <b>{center.voteStatus['Jatiya Party']}</b></div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Hover Info Box */}
            {hoveredFeature && (
                <div className="leaflet-bottom leaflet-left m-4 p-4 bg-white/90 backdrop-blur shadow-lg rounded-lg z-[1000] pointer-events-none">
                    <h4 className="font-bold text-gray-800">{hoveredFeature.name || hoveredFeature.NAME_4 || hoveredFeature.NAME_3 || "Region"}</h4>
                    <p className="text-sm text-gray-600">
                        {hoveredFeature.NAME_1 && `${hoveredFeature.NAME_1} Division`}
                    </p>
                </div>
            )}
        </MapContainer>
    );
}
