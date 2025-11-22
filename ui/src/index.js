import * as Cesium from "cesium";
import Sandcastle from "./Sandcastle.js";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./css/main.css";

// CesiumJS has a default access token built in but it's not meant for active use.
// please set your own access token can be found at: https://cesium.com/ion/tokens.
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjYjVmMTE4NS05ZWFiLTQxNWYtYTNmZi02ZmZjYTU5NTk1NGMiLCJpZCI6MzYyODExLCJpYXQiOjE3NjM4MTYwOTV9.muT85OaoLIY82MPNIemVvKXAQrT6EC-BD9QQE9YEa4A";

// Initialize the Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

// Camera centered on Earth
// viewer.camera.setView({
//   destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 15000000.0),
//   orientation: {
//     heading: Cesium.Math.toRadians(0.0),
//     pitch: Cesium.Math.toRadians(-90.0),
//     roll: 0.0,
//   },
// });

// Enable lighting and atmosphere
// viewer.scene.globe.enableLighting = true;
// viewer.scene.moon.show = true;
// viewer.scene.sun.show = true;

// Add Satellites button
Sandcastle.addDefaultToolbarButton("Satellites", function () {
  viewer.dataSources.add(
    Cesium.CzmlDataSource.load("SampleData/simple.czml")
  );
  viewer.camera.flyHome(8);
});

// Add Vehicle button
Sandcastle.addToolbarButton("Vehicle", function () {
  viewer.dataSources.add(
    Cesium.CzmlDataSource.load("SampleData/Vehicle.czml")
  );
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-116.52, 35.02, 95000),
    orientation: {
      heading: 6,
    },
  });
});

// Add Reset button
Sandcastle.addToolbarButton("Reset", function () {
  viewer.dataSources.removeAll();
  viewer.camera.flyHome(0);
});

// Add a custom button
Sandcastle.addToolbarButton("New Button", function () {
  console.log("New Button clicked!");
});

// Add a toggle button
let toggleValue1 = true;
Sandcastle.addToggleButton("Toggle Animation", toggleValue1, function (checked) {
  toggleValue1 = checked;
  viewer.clock.shouldAnimate = checked;
});

// Reset function
Sandcastle.reset = function () {
  viewer.dataSources.removeAll();
};