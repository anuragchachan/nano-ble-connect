import {createStackNavigator} from '@react-navigation/stack';
import {NavigationContainer} from '@react-navigation/native';

import BleScanScreen from '../screens/BleScanScreen';
import BleDataScreen from '../screens/BleDataScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="BleScanScreen" component={BleScanScreen} />
        <Stack.Screen name="BleDataScreen" component={BleDataScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
