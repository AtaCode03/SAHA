"""Synthetic software check only. No field model result or performance claim."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from train import run, NUM, CAT

root=Path('research/private/smoke')
root.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(42)
rows=[]
for i in range(30):
    area=float(rng.uniform(5,80))
    rows.append({'job_id':f'SYNTHETIC-{i}','field_group':f'SYNTHETIC-FIELD-{i%12}','source':'SYNTHETIC','planned_area_dekar':area,'tank_liters':None if i%4==0 else 30,'crew_size':1+i%2,'boundary_area_dekar':None,'perimeter_m':None,'compactness':None,'crop':'SYNTHETIC-CROP','drone_model':'SYNTHETIC-MODEL','growth_stage':None,'refill_access':'UNKNOWN','target_minutes':10+area*1.2+float(rng.uniform(0,10)),'split':'train' if i<18 else 'validation' if i<24 else 'test'})
file=root/'synthetic.csv'
pd.DataFrame(rows).to_csv(file,index=False)
try:
    run(file,root/'must-reject')
    raise AssertionError('Default pipeline accepted synthetic data')
except ValueError:
    pass
run(file,root/'output',synthetic_check=True)
report=json.loads((root/'output/report.json').read_text(encoding='utf-8'))
assert report['data_source']=='SYNTHETIC' and report['synthetic_check_only']
assert set(report['features'])==set(NUM+CAT)
assert 'target_minutes' not in report['features']
assert all(x['n']==6 for x in report['test'].values())
assert len(report['learning_curve'])==4
print('SYNTHETIC software smoke check passed; no real model performance evaluated.')
