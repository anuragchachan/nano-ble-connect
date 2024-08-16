import {createStackNavigator} from '@react-navigation/stack';
import {NavigationContainer} from '@react-navigation/native';

import BleScanScreen from '../screens/BleScanScreen';
import BleDataScreen from '../screens/BleDataScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="BleScanScreen"
          component={BleScanScreen}
          options={{title: 'BLE Scanner'}}
        />
        <Stack.Screen
          name="BleDataScreen"
          component={BleDataScreen}
          options={{title: 'Device Data'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
