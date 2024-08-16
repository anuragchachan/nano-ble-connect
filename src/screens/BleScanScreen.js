import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  NativeEventEmitter,
  NativeModules,
  Alert,
  Platform,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {SafeAreaView} from 'react-native-safe-area-context';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';

const BleScanScreen = ({navigation}) => {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
    let handleDiscoverPeripheral;

    const requestPermissions = async () => {
      try {
        // Request Bluetooth permissions based on API level
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            const bluetoothScanPermission = await request(
              PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
            );
            const bluetoothConnectPermission = await request(
              PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
            );
            const locationPermission = await request(
              PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            );

            if (
              bluetoothScanPermission !== RESULTS.GRANTED ||
              bluetoothConnectPermission !== RESULTS.GRANTED ||
              locationPermission !== RESULTS.GRANTED
            ) {
              Alert.alert(
                'Permissions Required',
                'This app needs Bluetooth and location permissions to scan for devices.',
                [{text: 'OK'}],
              );
              return;
            }
          } else {
            // Handle permissions for Android versions below API level 33
            const locationPermission = await request(
              PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            );

            if (locationPermission !== RESULTS.GRANTED) {
              Alert.alert(
                'Location Permission Required',
                'This app needs location permission to scan for devices.',
                [{text: 'OK'}],
              );
              return;
            }
          }
        }

        // Initialize BLE Manager
        BleManager.start({showAlert: false}).then(() => {
          console.log('BLE Module initialized');
        });
      } catch (err) {
        console.warn(err);
      }
    };

    requestPermissions();

    handleDiscoverPeripheral = peripheral => {
      setDevices(prevDevices => {
        if (!prevDevices.find(dev => dev.id === peripheral.id)) {
          return [...prevDevices, peripheral];
        }
        return prevDevices;
      });
    };

    const subscription = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );

    return () => {
      subscription.remove(); // Use remove() method on the subscription object
    };
  }, []);

  const startScan = () => {
    BleManager.scan([], 5, true).then(() => {
      console.log('Scanning...');
    });
  };

  const connectToDevice = device => {
    BleManager.connect(device.id).then(() => {
      navigation.navigate('BleDataScreen', {deviceId: device.id});
    });
  };

  return (
    <SafeAreaView>
      <Button title="Scan Devices" onPress={startScan} />
      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => connectToDevice(item)}>
            <Text>{item.name || 'Unnamed Device'}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

export default BleScanScreen;
