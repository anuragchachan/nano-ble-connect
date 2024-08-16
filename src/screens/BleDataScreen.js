import React, {useEffect, useState} from 'react';
import {View, Text, Button} from 'react-native';
import BleManager from 'react-native-ble-manager';
import RNFS from 'react-native-fs';
import {SafeAreaView} from 'react-native-safe-area-context';

const BleDataScreen = ({route}) => {
  const {deviceId} = route.params;
  const [data, setData] = useState([]);

  useEffect(() => {
    BleManager.retrieveServices(deviceId).then(() => {
      BleManager.startNotification(
        deviceId,
        'serviceUUID',
        'characteristicUUID',
      ).then(() => {
        console.log('Notification started');
      });
    });

    const handleUpdateValueForCharacteristic = ({
      value,
      peripheral,
      characteristic,
      service,
    }) => {
      setData(prevData => [...prevData, value]);
    };

    const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    return () => {
      bleManagerEmitter.removeListener(
        'BleManagerDidUpdateValueForCharacteristic',
        handleUpdateValueForCharacteristic,
      );
    };
  }, [deviceId]);

  const saveToCSV = () => {
    const path = `${RNFS.DocumentDirectoryPath}/data.csv`;
    const csvContent = data.map(value => value.join(',')).join('\n');
    RNFS.writeFile(path, csvContent, 'utf8').then(() => {
      console.log('File saved at:', path);
    });
  };

  return (
    <SafeAreaView>
      <Text>Receiving data from {deviceId}</Text>
      <Button title="Save to CSV" onPress={saveToCSV} />
    </SafeAreaView>
  );
};

export default BleDataScreen;
