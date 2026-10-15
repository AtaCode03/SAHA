"""Optional offline research component. Never a runtime dependency of the Node app."""
import argparse, json, time
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, median_absolute_error

NUM = ['planned_area_dekar', 'tank_liters', 'crew_size', 'boundary_area_dekar', 'perimeter_m', 'compactness']
CAT = ['crop', 'drone_model', 'growth_stage', 'refill_access']

def pipeline(kind, parameter):
    numeric = Pipeline([('impute', SimpleImputer(strategy='median', add_indicator=True, keep_empty_features=True)), ('scale', StandardScaler())])
    categorical = Pipeline([('impute', SimpleImputer(strategy='constant', fill_value='unknown')), ('encode', OneHotEncoder(handle_unknown='ignore', sparse_output=False))])
    prep = ColumnTransformer([('numeric', numeric, NUM), ('categorical', categorical, CAT)])
    model = Ridge(alpha=parameter) if kind == 'ridge' else RandomForestRegressor(n_estimators=200, min_samples_leaf=parameter, random_state=42, n_jobs=1)
    return Pipeline([('prepare', prep), ('model', model)])

def metrics(y, pred):
    errors = np.abs(np.asarray(y) - pred)
    rng = np.random.default_rng(42)
    bootstrap = [float(np.mean(rng.choice(errors, size=len(errors), replace=True))) for _ in range(1000)]
    return {'mae_minutes': float(mean_absolute_error(y, pred)), 'median_absolute_error_minutes': float(median_absolute_error(y, pred)), 'absolute_error_quantiles': {str(q): float(np.quantile(errors,q)) for q in [0, .25, .5, .75, .9, 1]}, 'mae_bootstrap_95_percent': [float(np.quantile(bootstrap,.025)), float(np.quantile(bootstrap,.975))], 'n': len(errors), 'uncertainty_note': 'Row bootstrap is descriptive; repeated fields can reduce independence. Inspect unseen-field results.'}

def run(csv_path, out, synthetic_check=False):
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    required = set(NUM + CAT + ['target_minutes', 'split', 'source', 'field_group', 'job_id'])
    if not required.issubset(df.columns):
        raise ValueError('Required export columns missing')
    expected_source = 'SYNTHETIC' if synthetic_check else 'REAL'
    if len(df) == 0 or not df.source.eq(expected_source).all():
        raise ValueError('Use non-empty REAL-only field data; synthetic metrics must never be reported as real.')
    if df.job_id.duplicated().any() or df.target_minutes.isna().any() or (df.target_minutes <= 0).any():
        raise ValueError('One unique completed job per row and positive target required')
    for c in NUM:
        df[c] = pd.to_numeric(df[c], errors='raise')
    if not np.isfinite(df.target_minutes).all() or any(not np.isfinite(df[c].dropna()).all() for c in NUM):
        raise ValueError('Infinite numeric values are invalid')
    order = df.split.map({'train':0,'validation':1,'test':2})
    if order.isna().any() or not order.is_monotonic_increasing:
        raise ValueError('Preserve chronological export row order and split labels')
    if df.planned_area_dekar.isna().any() or (df.planned_area_dekar <= 0).any():
        raise ValueError('Positive planned area required')
    for c in CAT:
        df[c] = df[c].astype(object).where(df[c].notna(), np.nan)
    train, valid, test = [df[df.split.eq(s)].copy() for s in ['train','validation','test']]
    if any(len(x) == 0 for x in [train,valid,test]):
        raise ValueError('Chronological train/validation/test partitions each need data; no fixed row count guarantees adequacy.')
    rate = train.target_minutes.sum() / train.planned_area_dekar.sum()
    candidates, selection = {}, []
    for kind, values in [('ridge',[.1,1.,10.]), ('forest',[2,5,10])]:
        for param in values:
            p = pipeline(kind,param).fit(train[NUM+CAT],train.target_minutes)
            score = mean_absolute_error(valid.target_minutes,p.predict(valid[NUM+CAT]))
            key = f'{kind}-{param}'
            candidates[key] = p
            selection.append({'model':key,'validation_mae_minutes':float(score)})
    best = min(selection, key=lambda x:x['validation_mae_minutes'])['model']
    selected = candidates[best]
    results, all_errors = {}, []
    for name, model in [('area_baseline',None), ('ridge',candidates[min((s for s in selection if s['model'].startswith('ridge')),key=lambda x:x['validation_mae_minutes'])['model']]), ('forest',candidates[min((s for s in selection if s['model'].startswith('forest')),key=lambda x:x['validation_mae_minutes'])['model']])]:
        t = time.perf_counter_ns()
        pred = test.planned_area_dekar.to_numpy()*rate if model is None else model.predict(test[NUM+CAT])
        elapsed = (time.perf_counter_ns()-t)/1e6
        result = metrics(test.target_minutes,pred)
        result['prediction_batch_ms'] = elapsed
        result['prediction_per_row_ms'] = elapsed/len(test)
        result['area_groups'] = {}
        edges = np.unique(np.quantile(train.planned_area_dekar,[0,.33,.67,1]))
        bins = [-np.inf]+list(edges[1:-1])+[np.inf]
        for group in pd.cut(test.planned_area_dekar,bins).unique():
            mask = (pd.cut(test.planned_area_dekar,bins)==group).to_numpy()
            if mask.any(): result['area_groups'][str(group)] = metrics(test.target_minutes[mask],pred[mask])
        unseen = ~test.field_group.isin(set(train.field_group)|set(valid.field_group))
        result['unseen_fields'] = metrics(test.target_minutes[unseen],pred[unseen]) if unseen.any() else {'n':0,'note':'No unseen fields in test; independent-field generalization unverified.'}
        seen = ~unseen
        result['seen_fields'] = metrics(test.target_minutes[seen],pred[seen]) if seen.any() else {'n':0}
        groups = test.field_group.unique()
        group_errors = {g:np.abs(test.target_minutes[test.field_group.eq(g)].to_numpy()-pred[test.field_group.eq(g).to_numpy()]) for g in groups}
        rng=np.random.default_rng(42)
        cluster_samples=[float(np.mean(np.concatenate([group_errors[g] for g in rng.choice(groups,size=len(groups),replace=True)]))) for _ in range(1000)]
        result['mae_field_cluster_bootstrap_95_percent']=[float(np.quantile(cluster_samples,.025)),float(np.quantile(cluster_samples,.975))]
        result['test_unique_fields']=len(groups)
        results[name] = result
        all_errors += [{'job_id':j,'model':name,'actual_minutes':float(y),'prediction_minutes':float(p),'absolute_error_minutes':float(abs(y-p))} for j,y,p in zip(test.job_id,test.target_minutes,pred)]
    curve = []
    for fraction in [.25,.5,.75,1.]:
        subset = train.iloc[:max(1,int(len(train)*fraction))]
        p = pipeline('ridge',1.).fit(subset[NUM+CAT],subset.target_minutes)
        curve.append({'train_n':len(subset),'unique_fields':subset.field_group.nunique(),'validation_mae_minutes':float(mean_absolute_error(valid.target_minutes,p.predict(valid[NUM+CAT])))})
    report = {'version':'experiment-1.0','seed':42,'data_source':expected_source,'synthetic_check_only':synthetic_check,'selected_on_validation':best,'baseline_train_minutes_per_dekar':float(rate),'selection':selection,'test':results,'learning_curve':curve,'features':NUM+CAT,'split':'Export chronological 60/20/20. No test preprocessing/tuning. Models remain fitted on train only.','interval_coverage':'No prediction interval supplied; coverage not claimed.','adequacy':'Inspect variety, learning curves, repeated fields and uncertainty. No guaranteed sample size or accuracy.','deployment':'Offline artifact only; production AI label disabled pending documented independent validation and approval.'}
    out.mkdir(parents=True,exist_ok=True)
    (out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    pd.DataFrame(all_errors).to_csv(out/'test_errors.csv',index=False)
    joblib.dump({'pipeline':selected,'features':NUM+CAT,'version':'experiment-1.0','data_source':expected_source,'deployable':False},out/'model.joblib')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('csv',type=Path)
    parser.add_argument('--output',type=Path,default=Path('research/private/output'))
    parser.add_argument('--synthetic-check',action='store_true',help='Only explicitly SYNTHETIC input; software smoke check, no real performance claim.')
    args = parser.parse_args()
    run(args.csv,args.output,args.synthetic_check)
