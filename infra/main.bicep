targetScope = 'resourceGroup'

@description('Trial region. Personal information stays in South Africa North.')
param location string = 'southafricanorth'

@description('Short prefix for resource names. Must be unique in Azure.')
param namePrefix string = 'nsnp'

@description('Postgres administrator login. Not a secret by itself.')
param postgresAdminLogin string = 'nsnpadmin'

@secure()
@description('Postgres administrator password. Supply this at deploy time. Do not commit it.')
param postgresAdminPassword string

@description('Container image for the trial API. Replace the placeholder before the first real deploy.')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var postgresName = toLower('${namePrefix}-pg')
var vaultName = toLower(take('${namePrefix}-kv', 24))
var environmentName = '${namePrefix}-env'
var apiName = '${namePrefix}-api'

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: '${namePrefix}-vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.40.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'snet-postgres'
        properties: {
          addressPrefix: '10.40.0.0/24'
          delegations: [
            {
              name: 'postgres'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
      {
        name: 'snet-apps'
        properties: {
          addressPrefix: '10.40.1.0/23'
          delegations: [
            {
              name: 'apps'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: 'snet-private'
        properties: {
          addressPrefix: '10.40.8.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

resource postgresDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: '${namePrefix}.private.postgres.database.azure.com'
  location: 'global'
}

resource postgresDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: postgresDns
  name: 'vnet-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource vaultDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}

resource vaultDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: vaultDns
  name: 'vnet-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Disabled'
      delegatedSubnetResourceId: '${vnet.id}/subnets/snet-postgres'
      privateDnsZoneArmResourceId: postgresDns.id
    }
  }
  dependsOn: [
    postgresDnsLink
  ]
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    vnetConfiguration: {
      infrastructureSubnetId: '${vnet.id}/subnets/snet-apps'
      internal: true
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiName
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 8787
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '8787'
            }
            {
              name: 'SMS_PROVIDER'
              value: 'console'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

resource vaultEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: '${vaultName}-pe'
  location: location
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/snet-private'
    }
    privateLinkServiceConnections: [
      {
        name: 'vault'
        properties: {
          privateLinkServiceId: vault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

resource vaultDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: vaultEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'vault'
        properties: {
          privateDnsZoneId: vaultDns.id
        }
      }
    ]
  }
}

output postgresName string = postgres.name
output apiName string = api.name
output vaultName string = vault.name
