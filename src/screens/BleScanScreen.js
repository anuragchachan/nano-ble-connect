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
  StatusBar,
  ScrollView,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {SafeAreaView} from 'react-native-safe-area-context';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import ScannerTab from '../components/ScannerTab';

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
  const [tabs, setTabs] = useState([{id: 1, name: 'Scanner'}]);
  const [activeTab, setActiveTab] = useState(1);

  const addTab = tabName => {
    const newTabId = tabs.length + 1;
    setTabs([...tabs, {id: newTabId, name: tabName}]);
    setActiveTab(newTabId);
  };

  const deleteTab = tabId => {
    const fillteredTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(fillteredTabs);
    if (tabId === activeTab) {
      setActiveTab(1);
    }
  };

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
                BleManager.enableBluetooth()
                  .then(() => handleScan())
                  .catch(error => {
                    Alert.alert('Error enabling Bluetooth:', error);
                  });
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
    console.log(isBluetoothOn);

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
    // console.log(device, '193');
    BleManager.connect(device.id).then(() => {
      // navigation.navigate('BleDataScreen', {device: device});
      addTab(device.name);
    });
  };

  const handleTabDelete = tabID => {
    deleteTab(tabID);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar barStyle="light-content" backgroundColor={'#5a86d5'} />
      <View style={styles.header}>
        <Text style={{fontSize: 20, fontWeight: '500', color: '#FFF'}}>
          Devices
        </Text>
        <Pressable onPress={handleScan}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: '#FFF',
              backgroundColor: '#3676E8',
              paddingVertical: 5,
              paddingHorizontal: 15,
              borderRadius: 5,
            }}>
            {buttonText}
          </Text>
        </Pressable>
      </View>
      <View style={styles.tabContainer}>
        <ScrollView horizontal contentContainerStyle={styles.scrollContainer}>
          {tabs.map(tab => (
            <Pressable
              key={tab.id}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.id)}>
              <Text style={styles.tabText}>{tab.name}</Text>
              {tab.id > 1 && (
                <Pressable
                  style={{position: 'absolute', top: 5, right: 5}}
                  onPress={() => handleTabDelete(tab.id)}>
                  <Text style={{color: '#FFF', fontSize: 16}}>X</Text>
                </Pressable>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{flex: 0.88, padding: 10}}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#6495ed" />
          </View>
        )}
        <ScannerTab devices={devices} message={message} />
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
    backgroundColor: '#6495ed',
  },
  tabContainer: {
    flex: 0.07,
    backgroundColor: '#6495ed',
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  tabButton: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  activeTab: {
    borderBottomColor: '#FFF',
    borderBottomWidth: 2,
  },
  tabText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 16,
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
});
