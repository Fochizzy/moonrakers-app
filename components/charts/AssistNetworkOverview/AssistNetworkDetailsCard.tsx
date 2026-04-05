// updated with Assist Efficiency
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';
import type { EdgeLayout, ModeKey, NodeLayout } from './buildAssistNetworkLayout';
import { formatModeValue, formatPercent, getModeLabel } from './buildAssistNetworkLayout';

function getAssistEff(edge:any){
  return edge.metrics.assistPrestige / Math.max(1, edge.metrics.assistCount);
}

export default function AssistNetworkDetailsCard({accent,mode,selectedNode,selectedEdge,nodeOutbound,nodeInbound,topSenders,topReceivers}:any){
  if(selectedEdge){
    const eff=getAssistEff(selectedEdge);
    return (
      <View style={{padding:12}}>
        <Text>{selectedEdge.fromName} → {selectedEdge.toName}</Text>
        <Text>Assist Eff: {eff.toFixed(2)}</Text>
      </View>
    )
  }
  return <View><Text>No selection</Text></View>
}
