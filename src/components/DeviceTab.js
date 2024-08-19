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
} from 'react-native';
import BleManager from 'react-native-ble-manager';

const DeviceTab = ({device, onDisconnect}) => {
  const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
  const {id: deviceId, name: deviceName} = device;
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [liveValues, setLiveValues] = useState({});
  const [notificationsActive, setNotificationsActive] = useState(true);

  useEffect(() => {
    // Retrieve services and characteristics
    BleManager.retrieveServices(deviceId).then(peripheralInfo => {
      const {characteristics} = peripheralInfo;

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
        peripheralInfo.characteristics.forEach(char => {
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
      setLiveValues(prevValues => ({
        ...prevValues,
        [characteristic]: floatValue,
      }));
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
                <Pressable
                  style={styles.toggleButton}
                  onPress={handleToggleNotifications}>
                  <Text style={styles.toggleButtonText}>
                    {notificationsActive
                      ? 'Stop Receiving Data'
                      : 'Start Receiving Data'}
                  </Text>
                </Pressable>
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
