import Ar from './ar';
import React from 'react';
import { AppRegistry, Text, Button, View } from 'react-native';
import { MapView } from 'expo'; 

var tilebelt = require('@mapbox/tilebelt');
var getPixels = require('get-pixels');

class Main extends React.Component {
  state = {
    isInAr: false,
    imageUrl: "https://raw.githubusercontent.com/jeff-da/elevation-data/master/0%2C2.png",
  }
  
  render() {
      console.log("state: " + this.state.isInAr);
      return ( 
        <React.Fragment>
          {!this.state.isInAr &&
            <MapView
              isVisible={!this.state.isInAr}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={e => { 
              var tf = tilebelt.pointToTileFraction(
                e.nativeEvent.coordinate.longitude,
                e.nativeEvent.coordinate.latitude, 
                15
              );
              var tile = tf.map(Math.floor);
              var tk =
                'pk.eyJ1IjoiamV4ZWxkIiwiYSI6ImNqa2w0aWx1aTA0b2wzcm85dDcya3EwcDUifQ.7sAmXe2EDd3CKdTsSg7yhg';
              var domain = 'https://api.mapbox.com/v4/';
              var source = `mapbox.satellite/${tile[2]}/${tile[0]}/${
                tile[1]
              }.png`;
              var elevationSource = `mapbox.terrain-rgb/${tile[2]}/${tile[0]}/${
                tile[1]
              }.png`;
              var url = `${domain}${source}?access_token=${tk}`;
              var elevationUrl = `${domain}${elevationSource}?access_token=${tk}`;
              console.log(elevationUrl);
              this.setState({
                isInAr: true,
                imageUrl: url,
                elevationImageUrl: elevationUrl,
              });
            }}
            />
          }
          {this.state.isInAr &&
            <Ar
              imageUrl={this.state.imageUrl}
              elevationImageUrl={this.state.elevationImageUrl}
            />
          }
        </React.Fragment>
      );
  }
}

export default Main;