import numpy as np, wave, sys
SR=44100; D=84.0; N=int(SR*D)
out=np.zeros(N); rnd=np.random.default_rng(1)
T=np.arange(N)/SR
def add(sig,at,gain=1.0):
    i=int(at*SR); j=min(N,i+len(sig)); out[i:j]+=sig[:j-i]*gain
def env(n,a=0.005,r=None):
    e=np.ones(n); ai=max(1,int(a*SR)); e[:ai]=np.linspace(0,1,ai)
    if r: e*=np.exp(-np.arange(n)/SR/r)
    return e
def lp(x,k=0.05):
    y=np.zeros_like(x); acc=0.0
    # one-pole lowpass (vectorised via cumulative filter approximation)
    from math import exp
    a=k
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
def tone(f,dur,harm=(1,),amp=None):
    t=np.arange(int(dur*SR))/SR; s=np.zeros_like(t)
    for h,a in zip(harm,amp or [1/(i+1) for i in range(len(harm))]): s+=a*np.sin(2*np.pi*f*h*t)
    return s
# horror drone 0-26
t=T[:int(26*SR)]
dr=0.5*np.sin(2*np.pi*55*t)+0.4*np.sin(2*np.pi*55.7*t)+0.25*np.sin(2*np.pi*82.4*t+np.sin(2*np.pi*0.2*t))
dr*=0.6+0.4*np.sin(2*np.pi*0.25*t)
dr*=np.minimum(1,t/1.5)*np.where(t>25.6,np.maximum(0,(26-t)/0.4),1)
add(dr,0,0.22)
# heartbeat 5-15
for b in np.arange(5.3,15,0.85):
    for o,g in ((0,1),(0.18,0.7)):
        n=int(0.25*SR); tt=np.arange(n)/SR
        add(np.sin(2*np.pi*(60-20*tt)*tt)*np.exp(-tt*18),b+o,0.55*g)
# impacts
def boom(at,g=1.0):
    n=int(1.2*SR); tt=np.arange(n)/SR
    s=np.sin(2*np.pi*(80*np.exp(-tt*3)+35)*tt)*np.exp(-tt*4)
    s+=rnd.standard_normal(n)*np.exp(-tt*25)*0.6
    add(s,at,g)
boom(1.2,0.9)
n=int(0.6*SR); add(rnd.standard_normal(n)*np.exp(-np.arange(n)/SR*9)*np.sin(np.arange(n)/SR*2*np.pi*3000)**2,1.22,0.35)  # glass
boom(26.0,1.0)
boom(55.6,0.6)
# chat pings
for at in [15.4,16.2,16.9,17.5,18.0,18.4,18.8,19.2,19.6,20.0]:
    s=tone(1318,0.18,(1,1.5),[0.6,0.3])*env(int(0.18*SR),0.002,0.05); add(s,at,0.35)
# zombie groan 15.3-18
n=int(2.8*SR); tt=np.arange(n)/SR
f=110+15*np.sin(2*np.pi*0.7*tt)
ph=2*np.cumsum(np.pi*f/SR)
g=np.sign(np.sin(ph))*0.3+np.sin(ph)
g=lp(g*(0.5+0.5*np.sin(2*np.pi*1.4*tt)**2),0.08)*np.minimum(1,tt/0.3)*np.minimum(1,(2.8-tt)/0.4)
add(g,15.3,0.35)
# whooshes at tip cards / panels
def whoosh(at,g=0.25):
    n=int(0.5*SR); tt=np.arange(n)/SR
    s=lp(rnd.standard_normal(n),0.15)*np.sin(np.pi*tt/0.5)
    add(s,at,g)
for at in [10.8,35.4,40.0,57.6,61.0,65.15,69.15]: whoosh(at)
# warm music from 26: C - Am - F - G, 120 bpm
notes={'C':[261.6,329.6,392.0],'Am':[220.0,261.6,329.6],'F':[174.6,220.0,261.6],'G':[196.0,246.9,293.7]}
prog=['C','Am','F','G']
start=26.2; bar=2.0
k=0
for bt in np.arange(start,D-0.5,bar):
    ch=notes[prog[k%4]]; k+=1
    dur=bar+0.1
    pad=sum(tone(f,dur,(1,2,3),[0.5,0.2,0.08]) for f in ch)
    e=np.minimum(1,np.arange(len(pad))/SR/0.3)*np.minimum(1,(dur-np.arange(len(pad))/SR)/0.3)
    add(pad*e,bt,0.06)
    add(tone(ch[0]/2,dur,(1,2),[0.7,0.2])*e,bt,0.10)
    arp=[ch[0]*2,ch[1]*2,ch[2]*2,ch[1]*2]
    for i in range(8):
        f=arp[i%4]; n=int(0.24*SR)
        add(tone(f,0.24,(1,2),[0.6,0.15])*env(n,0.003,0.08),bt+i*0.25,0.07)
    # soft kick on beats
    for i in range(4):
        n=int(0.2*SR); tt=np.arange(n)/SR
        add(np.sin(2*np.pi*(120*np.exp(-tt*25)+45)*tt)*np.exp(-tt*14),bt+i*0.5,0.25)
# blaster shots
for at,good in [(52.6,False),(55.0,True)]:
    n=int(0.35*SR); tt=np.arange(n)/SR
    f=1400*np.exp(-tt*(9 if good else 5))+200
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*8)
    add(s,at,0.3)
    if not good:
        n=int(0.5*SR); add(lp(rnd.standard_normal(n),0.05)*np.exp(-np.arange(n)/SR*6),53.4,0.4)  # fizzle puff
# success chimes
for at in [45.6,56.0]:
    for i,f in enumerate([784,988,1175,1568]):
        n=int(0.5*SR); add(tone(f,0.5,(1,2),[0.6,0.2])*env(n,0.003,0.18),at+i*0.07,0.15)
# card ticks in TIP4
for i in range(8):
    n=int(0.08*SR); add(tone(2000,0.08)*env(n,0.001,0.02),61.5+i*0.35,0.12)
# notification toasts
for at in [30.0,32.6]:
    n=int(0.3*SR); add((tone(988,0.3)+tone(1319,0.3)*0.6)*env(n,0.002,0.08),at,0.15)
# alarm clock 69.2-70.8
for at in np.arange(69.2,70.8,0.12):
    n=int(0.06*SR); add(tone(2600,0.06,(1,1.5),[0.5,0.3])*env(n,0.001),at,0.12)
# final hit + chord
boom(79.6,0.4)
for f in [261.6,329.6,392.0,523.3]:
    n=int(4.2*SR); add(tone(f,4.2,(1,2),[0.5,0.15])*env(n,0.01,1.6),79.6,0.09)
# master
fade=np.ones(N); fi=int(1.5*SR); fade[-fi:]=np.linspace(1,0,fi)
out*=fade
out/=np.max(np.abs(out))*1.12
pcm=(out*32767).astype(np.int16)
st=np.stack([pcm,pcm],1)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print('ok')
