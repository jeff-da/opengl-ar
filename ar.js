import { AR } from 'expo';
import ExpoTHREE, { THREE, AR as ThreeAR } from 'expo-three';
import AssetUtils from 'expo-asset-utils';
import React from 'react';
import  getPixels from 'get-pixels';

import { View as GraphicsView } from 'expo-graphics';
import TouchableView from './TouchableView';

function getCube(bumpTexture, imageTexture) {
	// magnitude of normal displacement
	let bumpScale = 0.2;
	
	let customUniforms = {
		bumpTexture: { type: "t", value: bumpTexture },
    imageTexture: { type: "t", value: imageTexture },
    bumpScale: { type: "f", value: bumpScale },
	};
	
	var customMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: customUniforms,
		vertexShader: ` 
uniform sampler2D bumpTexture;
uniform float bumpScale;

varying float vAmount;
varying vec2 vUV;

void main() 
{ 
	vUV = uv;
	vec4 bumpData = texture2D( bumpTexture, uv );

  float cX = 0.0;
  float cY = 1.0; 
  vAmount = bumpData.r*256.0 + bumpData.g*25.6 + bumpData.b * 0.512 - 15.0;
  // vAmount = ((bumpData.r * 256 * 256 + bumpData.g * 256 + bumpData.b) * 0.1);
	
  vec3 newPosition = position + normal * bumpScale * vAmount;
	gl_Position = (projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 ));
}

`,
		fragmentShader: `
varying vec2 vUV;
varying float vAmount;
uniform sampler2D imageTexture;

void main() 
{
	gl_FragColor = texture2D(imageTexture, vUV);
}
`,
		side: THREE.DoubleSide
	}   );
		
	var planeGeo = new THREE.PlaneGeometry( 5, 5, 50, 100 );
	var plane = new THREE.Mesh(	planeGeo, customMaterial );
  return plane;
}

class HitTest extends React.Component {
  render() {
    // Setup a basic Graphics View and wrap it in a touchable view that simplifies PanResponder
    return (
      <TouchableView
        style={{ flex: 1 }}
        shouldCancelWhenOutside={false}
        onTouchesBegan={this.onTouchesBegan}>
        <GraphicsView
          style={{ flex: 1 }}
          onContextCreate={this.onContextCreate}
          onRender={this.onRender}
          onResize={this.onResize}
          arTrackingConfiguration={AR.TrackingConfigurations.World}
          isArEnabled
          isArRunningStateEnabled
          isArCameraStateEnabled
        />
      </TouchableView>
    );
  }

  /*
    Standard AR setup
  */
  onContextCreate = async ({ gl, scale, width, height }) => {
    // Get horizontal plane data
    AR.setPlaneDetection(AR.PlaneDetectionTypes.Horizontal);

    const imageAsset = await AssetUtils.resolveAsync(this.props.imageUrl);
    const imageTexture = await ExpoTHREE.loadAsync(imageAsset);
    this.imageTexture = imageTexture;

    const bumpAsset = await AssetUtils.resolveAsync(this.props.elevationImageUrl);
    const bumpTexture = await ExpoTHREE.loadAsync(bumpAsset);
    this.bumpTexture = bumpTexture; 

    // Basic Three Renderer with polyfill for expo-three
    this.renderer = new ExpoTHREE.Renderer({
      gl,
      width,
      height,
      pixelRatio: scale,
    });

    this.scene = new THREE.Scene();
    // Add the camera stream to the background of the scene
    this.scene.background = new ThreeAR.BackgroundTexture(this.renderer);
    // Create an AR Camera that updates with the device position
    this.camera = new ThreeAR.Camera(width, height, 0.01, 1000);
    // Add an equal lighting to the scene
    this.scene.add(new THREE.AmbientLight(0xdddddd));

    // Add a light to give depth to the scene
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(1, 1, 1);
    this.scene.add(light);
  };

  onResize = ({ x, y, scale, width, height }) => {
    // When the phone resizes, we update the camera aspect ratio, and change the renderer
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(width, height);
  };

  onRender = delta => {
    // Update the renderer with the scene and camera
    this.renderer.render(this.scene, this.camera);
  };
  /*
    End Standard AR setup
  */

  // Called when `onPanResponderGrant` is invoked.
  onTouchesBegan = async ({ locationX: x, locationY: y }) => {
   if (!this.renderer) {
      return;
    }

    // Get the size of the renderer
    const size = this.renderer.getSize();

    // Invoke the native hit test method
    const { hitTest } = await AR.performHitTest(
      {
        x: x / size.width,
        y: y / size.height,
      },
      // Result type from intersecting a horizontal plane estimate, determined for the current frame.
      AR.HitTestResultTypes.HorizontalPlane
    );

    // Traverse the test results
    for (let hit of hitTest) {
      const { worldTransform } = hit;
      // If we've already placed a cube, then remove it
      if (this.cube) {
        this.scene.remove(this.cube);
      }

  
  let cube = getCube(this.bumpTexture, this.imageTexture);
  this.cube = cube;

      // Add the cube to the scene
      this.scene.add(this.cube);

      // Disable the matrix auto updating system
      this.cube.matrixAutoUpdate = false;

      /* 
      Parse the matrix array: ex: 
        [
          1,0,0,0,
          0,1,0,0,
          0,0,1,0,
          0,0,0,1
        ]
      */
      const matrix = new THREE.Matrix4();
      matrix.fromArray(worldTransform);

      this.cube.applyMatrix(matrix);

	    this.cube.rotation.x = -Math.PI / 2;
      this.cube.updateMatrix();
    }
  };
}

export default HitTest;