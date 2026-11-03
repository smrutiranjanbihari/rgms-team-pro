import React from "react";
import { SafeAreaView, ScrollView, Text, View, StyleSheet } from "react-native";
export default function App() {
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <Text style={s.kicker}>RURAL GAME MANAGEMENT SYSTEM</Text>
    <Text style={s.title}>🏏 RGMS Team Pro</Text>
    <Text style={s.subtitle}>Your village cricket, one platform.</Text>
    <View style={s.panel}><Text style={s.panelTitle}>Scorer workspace</Text><Text style={s.body}>No match selected</Text><Text style={s.note}>Match selection, offline event queue and live scoring are implemented in upcoming phases.</Text></View>
    <View style={s.panel}><Text style={s.panelTitle}>Quick modules</Text>{["My tournaments","Player Sports ID","Teams and squads","Fixtures and results","Sync status"].map(x=><Text key={x} style={s.item}>›  {x}</Text>)}</View>
    <Text style={s.footer}>Foundation preview · Not for live match operations yet</Text>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#f3f6fb"},page:{padding:22,gap:16},kicker:{fontSize:10,letterSpacing:1.4,color:"#64748b",fontWeight:"700",marginTop:20},title:{fontSize:28,fontWeight:"800",color:"#102b4e"},subtitle:{fontSize:15,color:"#64748b"},panel:{backgroundColor:"#fff",padding:20,borderRadius:16,borderWidth:1,borderColor:"#e5eaf1",gap:12},panelTitle:{fontSize:18,fontWeight:"700",color:"#172033"},body:{fontSize:15,color:"#334155"},note:{fontSize:12,color:"#64748b",lineHeight:18},item:{fontSize:15,color:"#334155",paddingVertical:7},footer:{fontSize:11,color:"#94a3b8",marginTop:8}});
