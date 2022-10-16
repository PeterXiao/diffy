import React from 'react';
import {AppBar, Dialog, DialogContent, Divider, Grid, IconButton, Link, List, ListItem, ListItemIcon, ListItemText, ListSubheader, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Toolbar, Tooltip, Typography} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotesIcon from '@mui/icons-material/Notes';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import Checkbox from '@mui/joy/Checkbox';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

// import './App.css';
import { RecursiveTreeView } from './RecursiveTreeView';

const target = ""
class App extends React.Component {
  state = {
    isIgnored:{},
    dialog: false,
    info : {
      primary: {target},
      secondary: {target},
      candidate: {target},
      relativeThreshold: 20,
      last_reset: 0,
      absoluteThreshold: 0.03,
      protocol: "http",
    },
    endpoints: {},
    selectedEndpoint: false,
    endpoint: {
      endpoint:{},
      fields:{}
    },
    field: {
      requests:[]
    },
    request:{
      request:{},
      left:{},
      right:{}
    }
  };
  api = {
    info : '/api/1/info',
    endpoints : '/api/1/info'
  }
  async componentDidMount() {
    this.fetchEndpoints();
    setInterval(() => {
      this.fetchEndpoints()
      if(this.state.selectedEndpoint){
        this.fetchEndpoint(this.state.selectedEndpoint)
      }
      if(this.state.selectedField){
        this.fetchField(this.state.selectedEndpoint, this.state.selectedField)
      }
    }, 2000);
    fetch('/api/1/info')
      .then(response => response.json())
      .then(info => this.setState({...this.state, info}));
  }
  
  fetchEndpoints(){
    return fetch('/api/1/endpoints')
    .then(response => response.json())
    .then(endpoints => this.setState({...this.state, endpoints}));
  }

  fetchField(endpointName, fieldName){
    return fetch(`/api/1/endpoints/${endpointName}/fields/${fieldName}/results`)
    .then(response => response.json())
    .then(field => this.setState({...this.state, field, selectedField: fieldName}));
  }
  fetchEndpoint(endpointName){
    return fetch(`/api/1/endpoints/${endpointName}/stats?include_weights=true&exclude_noise=false`)
    .then(response => response.json())
    .then(endpoint => this.setState({...this.state, endpoint, selectedEndpoint: endpointName}));
  }
  fetchRequest(id){
    return fetch(`/api/1/requests/${id}`)
    .then(response => response.json())
    .then(request => this.setState({...this.state, request, requestOpen:true}));
  }

  toggleIgnore(endpointName, fieldPrefix){
    const isIgnored = {...this.state.isIgnored}
    isIgnored[endpointName] = isIgnored[endpointName] || {}
    isIgnored[endpointName][fieldPrefix] = !isIgnored[endpointName][fieldPrefix]
    this.setState({...this.state, isIgnored})
  }
  isIgnored(endpointName, fieldPrefix){
    const root = this.state.isIgnored[endpointName];
    const path = fieldPrefix.split('.').reverse()
    return this.isIgnoredPath(root, path.pop(), path)
  }
  isIgnoredPath(root, prefix, remainingPath){
    return root && (root[prefix] || remainingPath.length && this.isIgnoredPath(root, `${prefix}.${remainingPath.pop()}`, remainingPath));
  }
  render() {
    const {info, endpoints, endpoint, field, request} = this.state;
    return (
<Grid container>
  <Grid item xs={12}>
    <AppBar position='static'>
      <Toolbar>
        <Typography variant="h6" color="inherit" sx={{ flexGrow: 1 }}>Diffy</Typography>
        <Tooltip title="Logs">
          <Link color="inherit" target="_blank" href="http://localhost:3000/explore">
            <IconButton color="inherit" aria-label="logs"><NotesIcon/></IconButton>
          </Link>
        </Tooltip>
        <Tooltip title="Metrics">
          <Link color="inherit" target="_blank" href="http://localhost:9090/graph">
            <IconButton color="inherit" aria-label="metrics"><AnalyticsIcon/></IconButton>
          </Link>
        </Tooltip>
        <Tooltip title="Traces">
          <Link color="inherit" target="_blank" href="http://localhost:16686/search">
            <IconButton color="inherit" aria-label="traces"><AccountTreeIcon/></IconButton>
          </Link>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton
            color="inherit"
            aria-label="settings"
            edge="end"
            onClick={() => {this.setState({...this.state, dialog: true})}}>
            <SettingsIcon/>
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  </Grid>
  <Grid item xs={3}>
    <List subheader={<ListSubheader>Endpoints</ListSubheader>}>
      {Object.keys(endpoints).map(name => {
          const {total, differences} = endpoints[name]
          return <ListItem key={name} button onClick={() => {this.fetchEndpoint(name)}}>
            <ListItemText primary={name} secondary={`${differences} failing of ${total} requests`}/>
            <ListItemIcon><NotificationsOffIcon/></ListItemIcon>
          </ListItem>
          })}
    </List>
  </Grid>
  <Grid item xs={4}>
    <List subheader={<ListSubheader>Fields</ListSubheader>}>
    <RecursiveTreeView
      fields={endpoint.fields}
      setFieldPrefix={(prefix) => this.fetchField(this.state.selectedEndpoint, prefix)}
      toggleIgnore={(prefix) => this.toggleIgnore(this.state.selectedEndpoint, prefix)}
      isIgnored={(prefix) => this.isIgnored(this.state.selectedEndpoint, prefix)}
    />
    </List>
  </Grid>
  <Grid item xs={5}>
    <List subheader={<ListSubheader>Differences</ListSubheader>}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>{'Type'}</TableCell>
          <TableCell>{'Expected'}</TableCell>
          <TableCell>{'Actual'}</TableCell>
          <TableCell>{'Details'}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
      {field.requests.flatMap((request) => {
        const {id} = request
        return Object.keys(request.differences).filter(key => key.startsWith(this.state.selectedField)).map(key => {
          const {type, left, right} = request.differences[key]
          return {id, type, left, right}
        })
        })
        .map(({id, type, left, right}) => {
        return <TableRow key={id}>
          <TableCell>{type}</TableCell>
          <TableCell>{left}</TableCell>
          <TableCell>{right}</TableCell>
          <TableCell><OpenInNewIcon button='true' onClick={() => {this.fetchRequest(id)}}/></TableCell>
        </TableRow>;
      })}
      </TableBody>
    </Table>
    </List>
  </Grid>
  <Dialog
    fullWidth
    maxWidth='md'
    open={!!this.state.dialog}
    onClose={()=>{this.setState({...this.state, dialog: false})}}>
    <DialogContent>
    <Grid container>
      <Grid item xs={6}>
        <Typography>Candidate Server</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>{info.candidate.target}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>Primary Server</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>{info.primary.target}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>Secondary Server</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>{info.secondary.target}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>Protocol</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>{info.protocol}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>Last Reset</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>{new Date(info.last_reset).toDateString()}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography>Thresholds</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography><strong>{info.relativeThreshold}%</strong> relative, <strong>{info.absoluteThreshold}%</strong> absolute</Typography>
      </Grid>
    </Grid>
    </DialogContent>
  </Dialog>
  <Dialog
    fullWidth
    maxWidth='md'
    open={!!this.state.requestOpen}
    onClose={()=>{this.setState({...this.state, requestOpen: false})}}>
      <DialogContent>
        <TableContainer>
        <Table>
        <TableHead><TableRow><TableCell>Request</TableCell></TableRow></TableHead>
        <TableBody><TableRow><TableCell>{<pre>{JSON.stringify(request.request,null,4)}</pre>}</TableCell></TableRow></TableBody>
        </Table>
        <Table>
        <TableHead>
        <TableRow><TableCell>Primary</TableCell><TableCell>Candidate</TableCell></TableRow>
        </TableHead>
        <TableBody>
        <TableRow>
        <TableCell>{<pre>{JSON.stringify(request.left,null,4)}</pre>}</TableCell>
        <TableCell>{<pre>{JSON.stringify(request.right,null,4)}</pre>}</TableCell>
        </TableRow>
        </TableBody>
        </Table>
        </TableContainer>
      </DialogContent>
  </Dialog>
</Grid>);
  }
}

export default App;