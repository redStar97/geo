"use client";
import React, { useState, useEffect } from 'react';
import { load } from '@loaders.gl/core';
import { CSVLoader } from '@loaders.gl/csv';
import { KMLLoader } from '@loaders.gl/kml';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const Home = () => {
  const [data, setData] = useState(null);
  const [layerType, setLayerType] = useState('');
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 2,
    pitch: 0,
    bearing: 0
  });

  const fetchData = async (inputUrl) => {
    try {
      let response;
      const options = { delimiter: inputUrl.endsWith('.tsv') ? '\t' : (inputUrl.endsWith('.dsv') ? '|' : ',') };

      if (inputUrl.endsWith('.csv') || inputUrl.endsWith('.tsv') || inputUrl.endsWith('.dsv')) {
        response = await load(inputUrl, CSVLoader, options);
        setLayerType('csv');
        console.log('Loaded CSV:', response);
      } else if (inputUrl.endsWith('.kml')) {
        const formats = ['raw', 'geojson', 'binary'];
        for (const format of formats) {
          try {
            response = await load(inputUrl, KMLLoader, { gis: { format } });
            setLayerType('kml');
            console.log(`Loaded KML with format ${format}:`, response);
            break;
          } catch (error) {
            console.error(`Failed to load KML with format ${format}:`, error);
          }
        }
      }

      if (response && Array.isArray(response) && response.length > 0) {
        setData(response);
        const firstPoint = response[0];
        if (firstPoint && firstPoint.Longitude && firstPoint.Latitude) {
          setViewState({
            longitude: parseFloat(firstPoint.Longitude),
            latitude: parseFloat(firstPoint.Latitude),
            zoom: 7,
            pitch: 0,
            bearing: 0
          });
        }
      } else if (response && response.features && response.features.length > 0) {
        setData(response);
        const firstFeature = response.features[0];
        if (firstFeature.geometry && firstFeature.geometry.coordinates) {
          const coordinates = firstFeature.geometry.type === 'Point' ?
            firstFeature.geometry.coordinates :
            firstFeature.geometry.coordinates[0];
          const [longitude, latitude] = coordinates;
          setViewState({
            longitude,
            latitude,
            zoom: 7,
            pitch: 0,
            bearing: 0
          });
        }
      } else {
        console.log('File is empty or not in expected format.');
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  useEffect(() => {
    if (url) {
      fetchData(url);
    }
  }, [url]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setUrl(inputUrl);
  };

  const layers = [
    layerType === 'csv' && new ScatterplotLayer({
      id: 'scatterplot-layer',
      data,
      getPosition: d => {
        return d.Longitude && d.Latitude ? [parseFloat(d.Longitude), parseFloat(d.Latitude)] : [0, 0];
      },
      getRadius: 100,
      getFillColor: [255, 255, 255, 50],
    }),
    layerType === 'kml' && new GeoJsonLayer({
      id: 'geojson-layer',
      data,
      filled: true,
      stroked: true,
      lineWidthScale: 2,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      getFillColor: [255, 255, 255, 50],
      getLineColor: [255, 255, 255, 100],
      getPointRadius: 100,
      getLineWidth: 1,
    })
  ].filter(Boolean);

  return (
    <div>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Unesite URL CSV, TSV, DSV, ili KML sloja"
            title="Unesite URL CSV, TSV, DSV, ili KML sloja"
            required
          />
          <button type="submit">Dodaj</button>
        </form>
      </div>
      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
        style={{ height: '100vh' }}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
      >
        <Map
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
        />
      </DeckGL>
    </div>
  );
};

export default Home;
