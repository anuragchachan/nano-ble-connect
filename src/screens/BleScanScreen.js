import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {SafeAreaView} from 'react-native-safe-area-context';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';

const BleScanScreen = ({navigation}) => {
  const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [buttonText, setButtonText] = useState('Scan');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState(
    'To Scan for BLE devices. Click On Scan.',
  );

  useEffect(() => {
    let timer;
    if (isScanning) {
      timer = setTimeout(() => {
        setLoading(false);
        setIsScanning(false);
        setButtonText('Scan');
      }, 30000);
    }
    return () => clearTimeout(timer);
  }, [isScanning]);

  useEffect(() => {
    //request permissions required
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
      } catch (err) {
        console.warn(err);
      }
    };
    requestPermissions();

    // Check Bluetooth state
    BleManager.checkState();

    // handle Bluetooth state changes
    const handleBluetoothStateChange = state => {
      console.log('Bluetooth state:', state);
      setIsBluetoothOn(state.state === 'on');
    };

    // Add the bluetooth listener
    const bluetoothListener = bleManagerEmitter.addListener(
      'BleManagerDidUpdateState',
      handleBluetoothStateChange,
    );

    // Initialize BLE Manager
    BleManager.start({showAlert: false}).then(() => {
      console.log('BLE Module initialized');
    });

    //handles found devices
    const handleDiscoverPeripheral = peripheral => {
      setDevices(prevDevices => {
        if (!prevDevices.find(dev => dev.id === peripheral.id)) {
          return [...prevDevices, peripheral];
        }
        return prevDevices;
      });
    };

    //device listener
    const subscription = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );

    return () => {
      subscription.remove();
      bluetoothListener.remove();
    };
  }, []);

  const promptEnableBluetooth = () => {
    Alert.alert(
      'Bluetooth is off',
      'Please turn on Bluetooth to start scanning.',
      [
        Platform.OS === 'android'
          ? {
              text: 'Enable',
              onPress: () => {
                BleManager.enableBluetooth();
                handleScan();
              },
            }
          : {
              text: 'Ok',
            },
        {text: 'Cancel', style: 'cancel'},
      ],
      {cancelable: true},
    );
  };

  const handleScan = () => {
    setLoading(true);
    if (isBluetoothOn) {
      if (!isScanning) {
        // Start scanning
        setIsScanning(true);
        setButtonText('Stop Scanning');
        BleManager.scan([], 30, true)
          .then(() => {
            console.log('Scan started');
          })
          .catch(err => {
            console.error('Scan error:', err);
            setIsScanning(false);
            setButtonText('Scan');
            setLoading(false);
          });
      } else {
        // Stop scanning
        setIsScanning(false);
        setButtonText('Scan');
        setLoading(false);
        BleManager.stopScan()
          .then(() => {
            console.log('Scan stopped');
          })
          .catch(err => {
            console.error('Stop scan error:', err);
          });
      }
    } else {
      setLoading(false);
      promptEnableBluetooth();
    }
  };

  const handleConnectToDevice = device => {
    BleManager.connect(device.id).then(() => {
      navigation.navigate('BleDataScreen', {deviceId: device.id});
    });
  };

  const renderItem = ({item}) => {
    return (
      <View style={styles.flatlistCard}>
        <Text style={{color: '#000', fontWeight: 500, fontSize: 14}}>
          {item?.name || 'Unnamed Device'}
        </Text>
        <Pressable
          onPress={() => handleConnectToDevice(item)}
          style={styles.connectBtn}>
          <Text style={{color: '#FFF', fontSize: 16, fontWeight: 500}}>
            Connect
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.header}>
        <Text style={{fontSize: 20, fontWeight: '500', color: '#1e90ff'}}>
          BLE Scanner
        </Text>
        <Pressable onPress={handleScan}>
          <Text style={{fontSize: 20, fontWeight: '500', color: '#1e90ff'}}>
            {buttonText}
          </Text>
        </Pressable>
      </View>
      <View style={{flex: 0.95, padding: 5}}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1E90FF" />
          </View>
        )}
        {devices.length === 0 ? (
          <View style={styles.message}>
            <Text
              style={{
                fontSize: 14,
                color: '#000',
              }}>
              {message}
            </Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              devices?.length > 0 && (
                <Text style={{color: '#000', fontSize: 16, marginVertical: 5}}>
                  List of Devices found
                </Text>
              )
            }
            renderItem={renderItem}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default BleScanScreen;

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
  message: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatlistCard: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  connectBtn: {
    backgroundColor: '#1e90ff',
    padding: 8,
    borderRadius: 4,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
});
