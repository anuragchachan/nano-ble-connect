import moment from 'moment';
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  NativeEventEmitter,
  NativeModules,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import RNFS from 'react-native-fs';

const DeviceTab = ({device, onDisconnect}) => {
  const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
  const {id: deviceId, name: deviceName} = device;
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [liveValues, setLiveValues] = useState({});
  const [notificationsActive, setNotificationsActive] = useState(true);
  const [csvFilePath, setCsvFilePath] = useState(null);
  const [headers, setHeaders] = useState([]);
  useEffect(() => {
    // Retrieve services and characteristics
    BleManager.retrieveServices(deviceId).then(peripheralInfo => {
      const {characteristics} = peripheralInfo;

      //to find all the characterstics of a service
      const organizedServices = characteristics.reduce((acc, char) => {
        const {service} = char;
        if (!acc[service]) {
          acc[service] = {uuid: service, characteristics: []};
        }
        acc[service].characteristics.push(char);
        return acc;
      }, {});

      // Convert to array of objects
      const servicesArray = Object.values(organizedServices);
      setServices(servicesArray);

      // Automatically start notifications for characteristics that support it
      if (notificationsActive) {
        characteristics.forEach(char => {
          if (char.properties.Notify) {
            BleManager.startNotification(
              deviceId,
              char.service,
              char.characteristic,
            )
              .then(() => {
                console.log('Notification started for', char.characteristic);
              })
              .catch(error => {
                console.error(
                  `Failed to start notification for ${char.characteristic}:`,
                  error,
                );
              });
          }
        });
      }
    });

    const handleUpdateValueForCharacteristic = data => {
      const {value, characteristic} = data;
      const buffer = new Uint8Array(value).buffer;
      const dataView = new DataView(buffer);
      const floatValue = dataView.getFloat32(0, true); // true for little-endian
      setLiveValues(prevValues => {
        const newValues = {...prevValues, [characteristic]: floatValue};
        if (csvFilePath) {
          appendToCSV(newValues);
        }
        return newValues;
      });
    };

    const characteristicSubscription = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    return () => {
      characteristicSubscription.remove();
      // stop notifications when component unmounts
      if (notificationsActive) {
        stopNotifications();
      }
    };
  }, [deviceId, notificationsActive]);

  useEffect(() => {
    if (selectedService) {
      startNotifications();
    } else {
      stopNotifications();
    }
  }, [selectedService]);

  const startNotifications = async () => {
    try {
      const service = services.find(s => s.uuid === selectedService);
      if (service) {
        for (const char of service.characteristics) {
          if (char.properties.Notify) {
            await BleManager.startNotification(
              deviceId,
              char.service,
              char.characteristic,
            );
            console.log('Notification started for', char.characteristic);
          }
        }
        setNotificationsActive(true);
        await initializeCSVFile(service);
      }
    } catch (error) {
      console.error('Failed to start notifications:', error);
    }
  };

  const stopNotifications = async () => {
    if (!selectedService) {
      console.log('No service selected');
      return;
    }

    try {
      // Find the selected service
      const service = services.find(s => s.uuid === selectedService);

      if (!service) {
        Alert.alert('Selected service not found');
        return;
      }

      // Gather all stop notification promises for characteristics of the selected service
      const stopPromises = service.characteristics.map(char =>
        BleManager.stopNotification(deviceId, char.service, char.characteristic)
          .then(() =>
            console.log('Notification stopped for', char.characteristic),
          )
          .catch(error =>
            console.error(
              'Failed to stop notification for',
              char.characteristic,
              ':',
              error,
            ),
          ),
      );

      // Await all promises to complete
      await Promise.all(stopPromises);

      // Update the notifications active state
      setNotificationsActive(false);
    } catch (error) {
      console.error('Failed to stop notifications:', error);
    }
  };

  const requestExternalStoragePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 23) {
          const externalStorageWritePermission = await request(
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          );

          const externalStorageReadPermission = await request(
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          );

          if (
            externalStorageWritePermission !== RESULTS.GRANTED ||
            externalStorageWritePermission !== RESULTS.GRANTED
          ) {
            Alert.alert(
              'Permissions Required',
              'This app needs External Storage permissions to save csv file.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    return false;
                  },
                },
              ],
            );
          }
          return true;
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  //save csv file to app internal storage
  const initializeCSVFile = async service => {
    setHeaders(service.characteristics.map(char => char.characteristic));
    const timestamp = moment().format('dd-mm-yyyy_hh-mm-ss');
    const path = `${RNFS.DocumentDirectoryPath}/${deviceName}_${timestamp}.csv`;
    const headerRow = headers.join(',') + '\n';
    try {
      await RNFS.writeFile(path, headerRow);
      console.log('CSV file initialized at:', path);
      setCsvFilePath(path);
    } catch (error) {
      console.error('Error initializing CSV file:', error);
    }
  };

  const appendToCSV = async values => {
    try {
      // Create a row with values mapped to headers
      const row =
        headers
          .map(header =>
            values[header] !== undefined ? values[header] : 'N/A',
          )
          .join(',') + '\n';

      // Append the row to the CSV file
      await RNFS.appendFile(csvFilePath, row);
    } catch (error) {
      console.error('Error appending to CSV file:', error);
    }
  };

  //save csv to phone external storage
  const handleDownloadCsv = async () => {
    try {
      const permissionGranted = await requestExternalStoragePermission();
      if (!permissionGranted) {
        Alert.alert('External Storage Permission not granted.');
        return;
      }
      const timestamp = moment().format('dd-mm-yyyy_hh-mm-ss');
      const externalPath = `${RNFS.DownloadDirectoryPath}/${deviceName}_${timestamp}.csv`;
      await RNFS.moveFile(csvFilePath, externalPath);
      console.log(`File saved at: ${externalPath}`);
      Alert.alert('File Downloaded Successfully');
    } catch (error) {
      console.error('Error saving CSV file:', error);
      Alert.alert('Error Downloading File');
      throw error;
    }
  };

  const handleServicePress = service => {
    setSelectedService(service.uuid);
  };

  const handleToggleNotifications = () => {
    if (notificationsActive) {
      stopNotifications();
      setNotificationsActive(false);
    } else {
      startNotifications();
      setNotificationsActive(true);
    }
  };

  const renderCharacteristic = item => {
    const charUUID = item.item.characteristic;
    return (
      <View style={styles.characteristicItem}>
        <Text style={styles.characteristicText}>
          Characteristic UUID: {charUUID}
        </Text>
        <Text style={styles.characteristicText}>
          Live Value:{' '}
          {liveValues[charUUID] !== undefined ? liveValues[charUUID] : 'N/A'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.servicesContainer}>
        {services.map(service => (
          <View key={service.uuid}>
            <Pressable
              style={styles.serviceButton}
              onPress={() => handleServicePress(service)}>
              <Text style={styles.serviceText}>
                Service UUID: {service.uuid}
              </Text>
            </Pressable>
            {selectedService === service.uuid && (
              <>
                <View style={{flexDirection: 'row'}}>
                  <Pressable
                    style={styles.toggleButton}
                    onPress={handleToggleNotifications}>
                    <Text style={styles.toggleButtonText}>
                      {notificationsActive
                        ? 'Stop Receiving Data'
                        : 'Start Receiving Data'}
                    </Text>
                  </Pressable>
                  {/* <Pressable
                    onPress={handleDownloadCsv}
                    style={styles.toggleButton}>
                    <Text>Save CSV</Text>
                  </Pressable> */}
                </View>

                <FlatList
                  data={service.characteristics}
                  renderItem={renderCharacteristic}
                  keyExtractor={item => item.characteristic}
                  style={styles.characteristicsList}
                />
              </>
            )}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  servicesContainer: {
    marginBottom: 10,
  },
  serviceButton: {
    padding: 10,
    backgroundColor: '#e7eef8',
    borderRadius: 5,
    marginBottom: 5,
  },
  serviceText: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleButton: {
    padding: 10,
    backgroundColor: '#3676E8',
    borderRadius: 5,
    marginBottom: 5,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  characteristicsList: {
    marginTop: 5,
  },
  characteristicItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  characteristicText: {
    fontSize: 14,
  },
});

export default DeviceTab;
