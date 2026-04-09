export const buttonSystem = {
  rectBase: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  softSurface: {
    backgroundColor: 'rgba(11, 19, 35, 0.90)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  ghostSurface: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  accentSurface: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: 'rgba(139, 92, 246, 0.42)',
  },
  blueSurface: {
    backgroundColor: 'rgba(59,130,246,0.16)',
    borderColor: 'rgba(59,130,246,0.34)',
  },
  greenSurface: {
    backgroundColor: 'rgba(34,197,94,0.16)',
    borderColor: 'rgba(34,197,94,0.30)',
  },
  redSurface: {
    backgroundColor: 'rgba(239,68,68,0.16)',
    borderColor: 'rgba(239,68,68,0.28)',
  },
  pillReplacement: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

export const buttonText = {
  primary: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  strong: {
    fontSize: 13,
    fontWeight: '900' as const,
    letterSpacing: 0.2,
  },
};
