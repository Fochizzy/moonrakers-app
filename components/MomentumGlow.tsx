const animatedStyle = useAnimatedStyle(() => {
  const opacity = interpolate(glow.value, [0, 1], [0.92, 1]);
  const scale = interpolate(glow.value, [0, 1], [1, 1.025]);

  return {
    opacity: active ? opacity : 1,
    transform: [{ scale }],
    shadowColor: '#63E6FF',
    shadowOpacity: active ? interpolate(glow.value, [0, 1], [0.12, 0.28]) : 0,
    shadowRadius: active ? interpolate(glow.value, [0, 1], [8, 18]) : 0,
    shadowOffset: { width: 0, height: 0 },
  };
});


