import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  NativeEventEmitter,
  NativeModules,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import RNFS from 'react-native-fs';
import {SafeAreaView} from 'react-native-safe-area-context';

const BleDataScreen = ({route}) => {
  const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
  const {device} = route.params;
  const {id: deviceId, name: deviceName} = device;
  const [data, setData] = useState([]);

  useEffect(() => {
    BleManager.retrieveServices(deviceId).then(peripheralInfo => {
      const characteristics = peripheralInfo.characteristics;
      characteristics.forEach(char => {
        if (char.properties.Notify) {
          BleManager.startNotification(
            deviceId,
            char.service,
            char.characteristic,
          ).then(() => {
            console.log('Notification started');
          });
        }
      });
    });

    const handleUpdateValueForCharacteristic = data => {
      const buffer = new Uint8Array(data.value).buffer;
      const dataView = new DataView(buffer);
      const floatValue = dataView.getFloat32(0, true); // true for little-endian
      // console.log(floatValue);
    };

    const characteristicSubcription = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    return () => {
      characteristicSubcription.remove();
    };
  }, [deviceId]);

  const handleDisconnect = () => {
    BleManager.disconnect(deviceId)
      .then(() => {
        console.log('device disconnected');
      })
      .catch(err => {
        Alert.alert('Error in disconnecting device', err, [
          {text: 'Ok'},
          {text: 'Cancel', style: 'cancel'},
        ]);
      });
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.header}>
        <Pressable onPress={handleDisconnect}>
          <Text style={{fontSize: 14, fontWeight: '500', color: '#FFF'}}>
            Disconnect
          </Text>
        </Pressable>
      </View>
      <View style={{flex: 0.95, padding: 5}}></View>
    </SafeAreaView>
  );
};

export default BleDataScreen;

const styles = StyleSheet.create({
  header: {
    flex: 0.05,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e7eef8',
    borderBottomColor: '#1e90ff',
    borderBottomWidth: 2,
  },
});
