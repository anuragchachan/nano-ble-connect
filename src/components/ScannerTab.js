import {View, Text, FlatList, Pressable, StyleSheet} from 'react-native';
import React from 'react';

const ScannerTab = ({devices, message}) => {
  const renderItem = ({item}) => {
    return (
      <View style={styles.itemContainer}>
        {/* row 1 */}
        <View style={styles.rowCard}>
          <Text style={{color: '#000', fontWeight: 500, fontSize: 16}}>
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
        {/* row 2 */}
        <View style={styles.rowCard}>
          <Text
            style={{
              fontSize: 14,
              color: '#000',
            }}>{`Device ID : ${item.id}`}</Text>
          <Text
            style={{
              fontSize: 14,
              color: '#000',
            }}>{`Signal : ${item.rssi} dBm`}</Text>
        </View>
      </View>
    );
  };
  return (
    <View style={styles.container}>
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
              <Text
                style={{
                  color: '#000',
                  fontSize: 16,
                  marginVertical: 5,
                  textTransform: 'capitalize',
                }}>
                List of Devices Found
              </Text>
            )
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

export default ScannerTab;

const styles = StyleSheet.create({
  container: {flex: 1},
  itemContainer: {
    flex: 2,
    marginBottom: 10,
    backgroundColor: '#cedbf2',
    padding: 5,
    borderRadius: 5,
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatlistCard: {},
  rowCard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectBtn: {
    backgroundColor: '#3676E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
});
